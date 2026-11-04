import os from "node:os";
import mongoose from "mongoose";
import ImageCleanupTask from "../models/imageCleanupTask.model.js";
import Car from "../models/car.model.js";
import ListingCreation from "../models/listingCreation.model.js";
import { deleteManyFromImageKit } from "../middlewares/upload.middleware.js";
import imagekit from "../config/imagekit.js";

// Multi-instance safety design:
//
// - ATOMIC CLAIM: a worker claims a task with a single findOneAndUpdate
//   that matches only unclaimed or lease-expired tasks, setting
//   claimedBy + leaseUntil. Exactly one worker can win the claim.
// - LEASE: 5 minutes. A crashed worker's tasks become reclaimable after
//   expiry; tasks from before leases existed (no leaseUntil) are treated
//   as expired immediately.
// - GUARDED TRANSITIONS: every terminal state change (completed / failed /
//   exhausted) filters on { claimedBy, status: "processing" }, so a stale
//   worker whose lease expired can never modify a task another worker
//   reclaimed. All side effects (ImageKit deletes, $pull, car delete) are
//   idempotent, so even a rare double-execution window is safe.
// - PRE-DELETE REFERENCE CHECK: immediately before deleting, each image
//   is re-verified against live Car references. Anything still referenced
//   (outside the task's own operation) is retained, never deleted.
// - BOUNDED RETRY: exponential backoff, MAX_ATTEMPTS, then "exhausted".
//   Permanent ImageKit failures (4xx) exhaust immediately.

const WORKER_ID = process.env.WORKER_ID || `${os.hostname()}:${process.pid}`;
const LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 10;
const BASE_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60_000;
const isDbConnected = () => mongoose.connection.readyState === 1;
let cleanupRunning = false;
let reconciliationRunning = false;
const MAX_TASKS_PER_RUN = 10;
const ORPHAN_GRACE_MS = Number(
  process.env.IMAGEKIT_ORPHAN_GRACE_MS || 24 * 60 * 60 * 1000,
);

// Task ids this worker has claimed and not yet finished. Used by
// releaseWorkerLeases() on shutdown so in-flight tasks become
// reclaimable immediately instead of waiting for lease expiry.
const inFlight = new Set();

const retryDelayMs = (attempts) =>
  Math.min(
    BASE_RETRY_DELAY_MS * 2 ** Math.max(attempts - 1, 0),
    MAX_RETRY_DELAY_MS,
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

// Only the owning worker may move a task out of "processing". Returns the
// updated doc, or null when the lease was lost (another worker reclaimed
// the task, or it already reached a terminal state).
const guardedTerminalUpdate = (taskId, workerId, update) =>
  ImageCleanupTask.findOneAndUpdate(
    { _id: taskId, claimedBy: workerId, status: "processing" },
    { $set: update },
    { new: true },
  );

const releaseClaim = {
  claimedBy: null,
  leaseUntil: null,
  nextAttemptAt: null,
};

const finishRelatedOperation = async (task, deletedPublicIds) => {
  if (task.operation === "listing_delete" && task.carId) {
    await Car.findByIdAndDelete(task.carId);
  }
  if (task.operation === "image_delete" && task.carId && task.imagePublicId) {
    // Only pull the reference when the file was actually deleted from
    // ImageKit — never drop a reference to an image we retained.
    if (deletedPublicIds.includes(task.imagePublicId)) {
      await Car.findByIdAndUpdate(task.carId, {
        $pull: { images: { public_id: task.imagePublicId } },
      });
    }
  }
};

// IMAGE SAFETY: re-verify, immediately before deletion, that each image is
// not referenced by any listing outside this task's own operation.
// - upload_rollback: the images must be referenced by nothing at all.
// - image_delete / listing_delete: only the task's own listing may
//   reference them (its reference is removed by finishRelatedOperation).
// Anything else is retained — never deleted.
const partitionDeletableImages = async (task) => {
  const images = task.images || [];
  if (!images.length) return { safe: [], unsafe: [] };
  const ids = [...new Set(images.map((image) => image.public_id))];

  const cars = await Car.find(
    { "images.public_id": { $in: ids } },
    { _id: 1, "images.public_id": 1 },
  ).lean();

  const referencedBy = new Map();
  for (const car of cars || []) {
    for (const image of car.images || []) {
      if (!ids.includes(image.public_id)) continue;
      if (!referencedBy.has(image.public_id)) {
        referencedBy.set(image.public_id, new Set());
      }
      referencedBy.get(image.public_id).add(String(car._id));
    }
  }

  const safe = [];
  const unsafe = [];
  for (const image of images) {
    const referencing = referencedBy.get(image.public_id) || new Set();
    let ok;
    if (task.operation === "upload_rollback") {
      ok = referencing.size === 0;
    } else {
      const ownId = task.carId ? String(task.carId) : null;
      ok = [...referencing].every((carId) => carId === ownId);
    }
    (ok ? safe : unsafe).push(image);
  }
  return { safe, unsafe };
};

const recordFailure = async (claimed, failures, workerId) => {
  const error = failures
    .map((item) => `${item.public_id || "image"}: ${item.error || "unknown error"}`)
    .join("; ")
    .slice(0, 2000);
  const permanent = failures.length > 0 && failures.every((item) => item.permanent);
  const attempts = claimed.attempts || 0;

  if (permanent || attempts >= MAX_ATTEMPTS) {
    return guardedTerminalUpdate(claimed._id, workerId, {
      status: "exhausted",
      lastError: permanent
        ? `Permanent ImageKit failure, will not retry: ${error}`
        : `Failed after ${attempts} attempts, will not retry: ${error}`,
      ...releaseClaim,
    });
  }
  return guardedTerminalUpdate(claimed._id, workerId, {
    status: "failed",
    lastError: error,
    claimedBy: null,
    leaseUntil: null,
    nextAttemptAt: new Date(Date.now() + retryDelayMs(attempts)),
  });
};

export const processImageCleanupTask = async (task, workerId = WORKER_ID) => {
  const now = new Date();
  // ATOMIC CLAIM: exactly one worker wins. Matches pending/failed tasks
  // plus processing tasks whose lease expired (or never had one —
  // pre-lease tasks are treated as expired so crashed workers' tasks
  // recover on the next run).
  const claimed = await ImageCleanupTask.findOneAndUpdate(
    {
      _id: task._id,
      nextAttemptAt: { $lte: now },
      $or: [
        { status: { $in: ["pending", "failed"] } },
        {
          status: "processing",
          $or: [{ leaseUntil: null }, { leaseUntil: { $lt: now } }],
        },
      ],
    },
    {
      $set: {
        status: "processing",
        claimedBy: workerId,
        leaseUntil: new Date(now.getTime() + LEASE_MS),
      },
      $inc: { attempts: 1 },
    },
    { new: true },
  );
  if (!claimed) return null;
  inFlight.add(String(claimed._id));

  try {
    const { safe, unsafe } = await partitionDeletableImages(claimed);
    const safeIds = safe.map((image) => image.public_id);

    if (safe.length) {
      const result = await deleteManyFromImageKit(safe);
      if (result.failed.length) {
        return await recordFailure(claimed, result.failed, workerId);
      }
    }

    await finishRelatedOperation(claimed, safeIds);
    return await guardedTerminalUpdate(claimed._id, workerId, {
      status: "completed",
      lastError: unsafe.length
        ? `Retained ${unsafe.length} image(s) still referenced by listings: ${unsafe
            .map((image) => image.public_id)
            .join(", ")}`
        : null,
      ...releaseClaim,
    });
  } catch (error) {
    // Unexpected error (DB failure mid-processing, etc.): never lose the
    // task silently. The guarded update only applies if we still own it.
    return await recordFailure(
      claimed,
      [{ error: error?.message || String(error) }],
      workerId,
    );
  } finally {
    inFlight.delete(String(claimed._id));
  }
};

export const processPendingImageCleanup = async (workerId = WORKER_ID) => {
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
    const now = new Date();
    const tasks = await ImageCleanupTask.find({
      nextAttemptAt: { $lte: now },
      $or: [
        { status: { $in: ["pending", "failed"] } },
        // Crashed workers' tasks: lease expired (or never set) — reclaim.
        {
          status: "processing",
          $or: [{ leaseUntil: null }, { leaseUntil: { $lt: now } }],
        },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(MAX_TASKS_PER_RUN);

    for (const task of tasks) {
      try {
        await processImageCleanupTask(task, workerId);
      } catch (error) {
        // Last resort: only mark failed if this worker still owns the
        // task — never clobber another worker's claim.
        await ImageCleanupTask.findOneAndUpdate(
          { _id: task._id, claimedBy: workerId, status: "processing" },
          {
            $set: {
              status: "failed",
              lastError: String(error?.message || error).slice(0, 2000),
              claimedBy: null,
              leaseUntil: null,
              nextAttemptAt: new Date(Date.now() + BASE_RETRY_DELAY_MS),
            },
          },
        );
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

// Called on graceful shutdown: expire this worker's in-flight leases
// immediately so the next boot reclaims them instead of waiting out the
// lease. Safe if a task already finished — the filter only matches tasks
// this worker still owns in "processing".
export const releaseWorkerLeases = async (workerId = WORKER_ID) => {
  if (!isDbConnected() || inFlight.size === 0) return 0;
  const ids = [...inFlight];
  const result = await ImageCleanupTask.updateMany(
    { _id: { $in: ids }, claimedBy: workerId, status: "processing" },
    { $set: { leaseUntil: new Date(0) } },
  );
  inFlight.clear();
  return result.modifiedCount ?? 0;
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
