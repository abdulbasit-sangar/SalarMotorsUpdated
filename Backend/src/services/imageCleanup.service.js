import mongoose from "mongoose";
import ImageCleanupTask from "../models/imageCleanupTask.model.js";
import Car from "../models/car.model.js";
import ListingCreation from "../models/listingCreation.model.js";
import { deleteManyFromImageKit } from "../middlewares/upload.middleware.js";
import imagekit from "../config/imagekit.js";

const RETRY_DELAY_MS = 60_000;
const isDbConnected = () => mongoose.connection.readyState === 1;
let cleanupRunning = false;
let reconciliationRunning = false;
const MAX_TASKS_PER_RUN = 10;
const ORPHAN_GRACE_MS = Number(
  process.env.IMAGEKIT_ORPHAN_GRACE_MS || 24 * 60 * 60 * 1000,
);

export const createImageCleanupTask = async ({
  operationKey,
  operation,
  carId,
  images = [],
  imagePublicId,
  lastError,
}) => {
  if (!images.length) return null;

  return ImageCleanupTask.findOneAndUpdate(
    { operationKey },
    {
      $setOnInsert: {
        operationKey,
        operation,
        carId,
        images,
        imagePublicId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
      },
      ...(lastError && { $set: { lastError } }),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const finishRelatedOperation = async (task) => {
  if (task.operation === "listing_delete" && task.carId) {
    await Car.findByIdAndDelete(task.carId);
  }
  if (task.operation === "image_delete" && task.carId && task.imagePublicId) {
    await Car.findByIdAndUpdate(task.carId, {
      $pull: { images: { public_id: task.imagePublicId } },
    });
  }
};

export const processImageCleanupTask = async (task) => {
  const claimed = await ImageCleanupTask.findOneAndUpdate(
    {
      _id: task._id,
      status: { $in: ["pending", "failed"] },
      nextAttemptAt: { $lte: new Date() },
    },
    {
      $set: { status: "processing" },
      $inc: { attempts: 1 },
    },
    { new: true },
  );
  if (!claimed) return null;

  const result = await deleteManyFromImageKit(claimed.images);
  if (result.failed.length) {
    const error = result.failed
      .map((item) => `${item.public_id}: ${item.error}`)
      .join("; ");
    return ImageCleanupTask.findByIdAndUpdate(
      claimed._id,
      {
        $set: {
          status: "failed",
          lastError: error,
          nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
        },
      },
      { new: true },
    );
  }

  await finishRelatedOperation(claimed);
  return ImageCleanupTask.findByIdAndUpdate(
    claimed._id,
    { $set: { status: "completed", lastError: null } },
    { new: true },
  );
};

export const processPendingImageCleanup = async () => {
  // Connection-aware: don't hammer MongoDB with find/update calls while it's
  // down — those calls previously threw straight into the interval's
  // catch(), producing "Image cleanup worker failed: ECONNRESET" /
  // "secureConnect timed out" on every 60s tick for as long as the outage
  // lasted. Skip the cycle instead; it resumes on its own once reconnected.
  if (!isDbConnected()) return;
  // Overlap guard: a run that takes longer than the 60s interval (e.g. many
  // pending tasks, or ImageKit responding slowly) must not have a second
  // run start on top of it.
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const tasks = await ImageCleanupTask.find({
      status: { $in: ["pending", "failed"] },
      nextAttemptAt: { $lte: new Date() },
    })
      .sort({ createdAt: 1 })
      .limit(MAX_TASKS_PER_RUN);

    for (const task of tasks) {
      try {
        await processImageCleanupTask(task);
      } catch (error) {
        await ImageCleanupTask.findByIdAndUpdate(task._id, {
          $set: {
            status: "failed",
            lastError: error.message,
            nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
          },
        });
      }
    }

    const staleCreations = await ListingCreation.find({
      status: "processing",
      leaseUntil: { $lt: new Date() },
      uploadedImages: { $exists: true, $ne: [] },
    }).limit(MAX_TASKS_PER_RUN);
    for (const creation of staleCreations) {
      if (creation.carId) continue;
      // Root-cause fix: a record can be "processing" with no carId set
      // purely because the completion write failed after Car.create()
      // already succeeded (see listingCreation.service.js). Without this
      // check, once the lease expired this worker would treat that Car's
      // own images as an orphaned upload and queue them for deletion from
      // ImageKit — corrupting a live listing. Reconcile first.
      const existingCar = await Car.findOne({
        creationOperationId: creation._id,
      });
      if (existingCar) {
        await ListingCreation.findByIdAndUpdate(creation._id, {
          $set: {
            status: "completed",
            carId: existingCar._id,
            leaseUntil: null,
            errorMessage: null,
          },
        });
        continue;
      }
      await createImageCleanupTask({
        operationKey: `stale-creation:${creation._id}`,
        operation: "upload_rollback",
        images: creation.uploadedImages,
        lastError: "Creation lease expired before completion",
      });
      await ListingCreation.findByIdAndUpdate(creation._id, {
        $set: {
          status: "failed",
          errorMessage: "Creation lease expired before completion",
          leaseUntil: null,
        },
      });
    }
  } finally {
    cleanupRunning = false;
  }
};

export const reconcileUnreferencedImageKitFiles = async () => {
  if (!isDbConnected()) return;
  if (reconciliationRunning) return;
  reconciliationRunning = true;
  try {
    const referenced = new Set();
    const cars = await Car.find({}, { "images.public_id": 1 }).lean();
    cars.forEach((car) =>
      (car.images || []).forEach((image) => referenced.add(image.public_id)),
    );

    const response = await imagekit.listFiles({
      path: "/cars",
      tags: ["car"],
      limit: 1000,
    });
    const files = Array.isArray(response) ? response : response?.data || [];
    const cutoff = Date.now() - ORPHAN_GRACE_MS;
    for (const file of files || []) {
      const createdAt = new Date(file.createdAt || 0).getTime();
      const isCarFile = (file.tags || []).includes("car");
      if (
        isCarFile &&
        file.type !== "folder" &&
        file.fileId &&
        !referenced.has(file.fileId) &&
        createdAt > 0 &&
        createdAt < cutoff
      ) {
        await createImageCleanupTask({
          operationKey: `orphan-scan:${file.fileId}`,
          operation: "upload_rollback",
          images: [
            {
              url: file.url || "https://placeholder.invalid/orphan",
              public_id: file.fileId,
            },
          ],
          lastError: "Unreferenced ImageKit file found by reconciliation scan",
        });
      }
    }
  } finally {
    reconciliationRunning = false;
  }
};
