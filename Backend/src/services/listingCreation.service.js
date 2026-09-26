import { ApiError } from "../utils/apiHelpers.js";
import ListingCreation from "../models/listingCreation.model.js";
import Car from "../models/car.model.js";

const LEASE_MS = 10 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,200}$/;

export const validateIdempotencyKey = (key) => {
  if (!key || !KEY_PATTERN.test(key)) {
    throw new ApiError(
      400,
      "A valid Idempotency-Key is required to create a listing",
    );
  }
};

const getCompletedCar = async (record) => {
  if (!record.carId) return null;
  const car = await Car.findById(record.carId);
  if (!car) {
    throw new ApiError(409, "The idempotent listing result is unavailable");
  }
  return car;
};

// Shared reconciliation: if a record is stuck "processing" because the
// completion write failed after the Car was actually persisted, this finds
// the Car via Car.creationOperationId and promotes the record to
// "completed". Previously this logic lived only inside beginListingCreation
// (reached only when the admin resubmits with the same Idempotency-Key), so
// passive status polling (getListingCreationStatus, used by the frontend's
// waitForCreationStatus loop) could never observe it and would poll
// "processing" forever until it gave up — the exact reported bug.
const reconcileProcessingRecord = async (record) => {
  if (record.status !== "processing") return record;

  if (record.carId) {
    const car = await Car.findById(record.carId);
    if (car) {
      return (
        (await ListingCreation.findByIdAndUpdate(
          record._id,
          { $set: { status: "completed", leaseUntil: null } },
          { new: true },
        )) || record
      );
    }
    return record;
  }

  const existingCar = await Car.findOne({ creationOperationId: record._id });
  if (existingCar) {
    return (
      (await ListingCreation.findByIdAndUpdate(
        record._id,
        {
          $set: {
            status: "completed",
            carId: existingCar._id,
            leaseUntil: null,
            errorMessage: null,
          },
        },
        { new: true },
      )) || record
    );
  }

  return record;
};

export const beginListingCreation = async (adminId, key, requestHash) => {
  validateIdempotencyKey(key);
  const now = new Date();
  let record = await ListingCreation.findOne({
    adminId,
    idempotencyKey: key,
  });

  let newlyCreated = false;

  if (!record) {
    try {
      record = await ListingCreation.create({
        adminId,
        idempotencyKey: key,
        requestHash,
        status: "processing",
        leaseUntil: new Date(Date.now() + LEASE_MS),
      });

      newlyCreated = true;
    } catch (error) {
      if (error.code !== 11000) throw error;

      record = await ListingCreation.findOne({
        adminId,
        idempotencyKey: key,
      });
    }
  }

  if (!record) throw new ApiError(503, "Could not reserve listing creation");
  if (record.requestHash !== requestHash) {
    throw new ApiError(409, "This Idempotency-Key was used for different data");
  }
  if (newlyCreated) {
    return {
      record,
      car: null,
      replay: false,
      processing: false,
    };
  }
  if (record.status === "completed") {
    return { record, car: await getCompletedCar(record), replay: true };
  }

  if (record.status === "processing") {
    const reconciled = await reconcileProcessingRecord(record);
    if (reconciled.status === "completed") {
      return {
        record: reconciled,
        car: await getCompletedCar(reconciled),
        replay: true,
      };
    }
    if (reconciled.leaseUntil && reconciled.leaseUntil > now) {
      return { record: reconciled, car: null, replay: false, processing: true };
    }
    record = reconciled;
  }

  const claimed = await ListingCreation.findOneAndUpdate(
    {
      _id: record._id,
      requestHash,
      $or: [
        { status: "failed" },
        { status: "processing", leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "processing",
        leaseUntil: new Date(Date.now() + LEASE_MS),
        errorMessage: null,
        cleanupTaskId: null,
      },
      $inc: { attempts: 1 },
    },
    { new: true },
  );

  if (!claimed) {
    const current = await ListingCreation.findById(record._id);
    if (current?.status === "processing") {
      return { record: current, car: null, replay: false, processing: true };
    }
    throw new ApiError(409, "This listing creation is already in progress");
  }
  return { record: claimed, car: null, replay: false };
};

export const completeListingCreation = async (recordId, carId) =>
  ListingCreation.findByIdAndUpdate(recordId, {
    $set: { status: "completed", carId, leaseUntil: null, errorMessage: null },
  });

export const recordUploadedImages = async (recordId, images) =>
  ListingCreation.findByIdAndUpdate(recordId, {
    $set: { uploadedImages: images },
  });

export const failListingCreation = async (
  recordId,
  errorMessage,
  cleanupTaskId,
) =>
  ListingCreation.findByIdAndUpdate(recordId, {
    $set: {
      status: "failed",
      errorMessage,
      cleanupTaskId: cleanupTaskId || null,
      leaseUntil: null,
    },
  });

export const getListingCreationStatus = async (adminId, key) => {
  validateIdempotencyKey(key);
  let record = await ListingCreation.findOne({
    adminId,
    idempotencyKey: key,
  });
  if (!record) throw new ApiError(404, "Listing creation was not found");
  // Reconcile on every poll, not just on a fresh submit — this is the fix
  // that lets a client waiting on waitForCreationStatus() actually observe
  // a Car that was persisted but never got its completion write recorded.
  record = await reconcileProcessingRecord(record);
  if (
    record.status === "processing" &&
    record.leaseUntil &&
    record.leaseUntil <= new Date()
  ) {
    // A worker or request that owns this lease has abandoned the operation.
    // Do not make the browser poll a dead job until its client-side timeout;
    // mark it retryable so the next identical submit can reclaim the key.
    record =
      (await ListingCreation.findOneAndUpdate(
        {
          _id: record._id,
          status: "processing",
          leaseUntil: { $lte: new Date() },
        },
        {
          $set: {
            status: "failed",
            errorMessage:
              "Listing creation expired before it could be saved. Please try again.",
            leaseUntil: null,
          },
        },
        { new: true },
      )) || record;
  }
  return {
    status: record.status,
    car: record.status === "completed" ? await getCompletedCar(record) : null,
    errorMessage: record.errorMessage,
  };
};
