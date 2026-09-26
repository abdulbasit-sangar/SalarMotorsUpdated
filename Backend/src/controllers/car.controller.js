import { asyncHandler, ApiResponse } from "../utils/apiHelpers.js";
import {
  createCarService,
  getAllCarsService,
  getCarByIdService,
  searchCarsService,
  filterCarsService,
  getSimilarCarsService,
  toggleFeatureCarService,
  toggleHideCarService,
  toggleSoldCarService,
  updateCarFeaturesService,
  addCarImagesService,
  removeCarImageService,
  replaceCarImagesService,
  reorderCarImagesService,
  getFeaturedCarsService,
  deleteCarService,
  getCarOptionsService,
} from "../services/car.service.js";
import {
  uploadManyToImageKit,
  deleteManyFromImageKit,
} from "../middlewares/upload.middleware.js";
import { createImageCleanupTask } from "../services/imageCleanup.service.js";
import { hashListingRequest } from "../utils/requestHash.js";
import {
  beginListingCreation,
  completeListingCreation,
  failListingCreation,
  getListingCreationStatus,
  recordUploadedImages,
} from "../services/listingCreation.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/cars
export const createCar = asyncHandler(async (req, res) => {
  // createdBy is set from the authenticated JWT user (req.admin), never
  // from the request body — see the Manager/Sub-Admin RBAC notes on
  // Car.createdBy in car.model.js.
  const idempotencyKey = req.get("Idempotency-Key");
  const requestHash = hashListingRequest(req.body, req.files);
  const claim = await beginListingCreation(
    req.admin._id,
    idempotencyKey,
    requestHash,
  );

  if (claim.replay) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { car: claim.car }, "Car listed successfully"),
      );
  }

  if (claim.processing) {
    return res
      .status(202)
      .json(
        new ApiResponse(
          202,
          { status: "processing", idempotencyKey },
          "Listing creation is still processing",
        ),
      );
  }

  let car;
  try {
    car = await createCarService(
      req.body,
      req.files,
      req.admin._id,
      `upload-rollback:${req.admin._id}:${idempotencyKey}`,
      claim.record._id,
      (images) => recordUploadedImages(claim.record._id, images),
    );
  } catch (error) {
    // The Car document does NOT exist yet at this point (createCarService
    // failed before or during Car.create()) — this is a genuine creation
    // failure, so it's safe to mark the record failed. This write is
    // itself best-effort: if the same outage that caused `error` also
    // breaks this write, the record is simply left "processing" and its
    // lease will expire naturally, letting it be reclaimed on retry instead
    // of silently corrupting state.
    await failListingCreation(
      claim.record._id,
      error.message,
      error.cleanupTaskId,
    ).catch((markErr) => {
      console.error(
        "[createCar] failListingCreation write also failed:",
        markErr.message,
      );
    });
    throw error;
  }

  // The Car is persisted. Completion is idempotency bookkeeping and must not
  // hold the successful listing response hostage to a second MongoDB write.
  // Status polling can reconcile the record from creationOperationId if this
  // write is delayed or fails.
  completeListingCreation(claim.record._id, car._id).catch(
    (completionError) => {
      console.error(
        "[createCar] Car persisted but completion write failed:",
        completionError.message,
      );
    },
  );

  return res
    .status(201)
    .json(new ApiResponse(201, { car }, "Car listed successfully"));
});

// GET /api/cars/creation-status/:key — recover a response after a client
// disconnects after the backend has completed the operation.
export const getCreationStatus = asyncHandler(async (req, res) => {
  const result = await getListingCreationStatus(req.admin._id, req.params.key);
  const statusCode = result.status === "completed" ? 200 : 202;
  return res
    .status(statusCode)
    .json(new ApiResponse(statusCode, result, "Listing creation status"));
});

// GET /api/cars
export const getAllCars = asyncHandler(async (req, res) => {
  const result = await getAllCarsService(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Cars fetched successfully"));
});

export const getAdminCars = asyncHandler(async (req, res) => {
  const result = await getAllCarsService(req.query, true);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Admin cars fetched successfully"));
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4
// ─────────────────────────────────────────────────────────────────────────────

// Step 13: GET /api/cars/:id
export const getCarById = asyncHandler(async (req, res) => {
  const car = await getCarByIdService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, { car }, "Car fetched successfully"));
});

// Step 14: GET /api/cars/search?keyword=Toyota
export const searchCars = asyncHandler(async (req, res) => {
  const result = await searchCarsService(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Search results fetched"));
});

// Step 15 & 16: GET /api/cars/filter?brand=Toyota&fuelType=Hybrid&sort=price_asc
export const filterCars = asyncHandler(async (req, res) => {
  const result = await filterCarsService(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Filtered cars fetched"));
});

// Step 18: GET /api/cars/similar/:id
export const getSimilarCars = asyncHandler(async (req, res) => {
  const result = await getSimilarCarsService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Similar cars fetched"));
});

// Step 19: PATCH /api/cars/feature/:id  &  PATCH /api/cars/hide/:id
export const toggleFeatureCar = asyncHandler(async (req, res) => {
  const car = await toggleFeatureCarService(req.params.id);
  const msg = car.featured
    ? "Car marked as featured"
    : "Car removed from featured";
  return res.status(200).json(new ApiResponse(200, { car }, msg));
});

export const toggleHideCar = asyncHandler(async (req, res) => {
  const car = await toggleHideCarService(req.params.id);
  const msg = car.isHidden
    ? "Car hidden from public listings"
    : "Car restored to public listings";
  return res.status(200).json(new ApiResponse(200, { car }, msg));
});

// PATCH /api/cars/sold/:id — Sold Vehicle Indicator (Admin/Manager)
export const toggleSoldCar = asyncHandler(async (req, res) => {
  const car = await toggleSoldCarService(req.params.id);
  const msg = car.isSold ? "Car marked as sold" : "Car marked as available";
  return res.status(200).json(new ApiResponse(200, { car }, msg));
});

// PATCH /api/cars/features/:id — Vehicle Features System (Admin/Manager)
export const updateCarFeatures = asyncHandler(async (req, res) => {
  const car = await updateCarFeaturesService(req.params.id, req.body.features);
  return res
    .status(200)
    .json(
      new ApiResponse(200, { car }, "Vehicle features updated successfully"),
    );
});

// PATCH /api/cars/images/:id — add one or more images (Admin/Manager)
// multipart/form-data, field name "images" (same as create) — uploaded to
// ImageKit here, then appended to the car's existing image list.
export const addCarImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No images provided"));
  }
  const newImages = await uploadManyToImageKit(req.files);
  let car;
  try {
    car = await addCarImagesService(req.params.id, newImages);
  } catch (error) {
    const cleanup = await deleteManyFromImageKit(newImages);
    if (cleanup.failed.length) {
      await createImageCleanupTask({
        operationKey: `image-upload-rollback:${req.params.id}:${Date.now()}`,
        operation: "upload_rollback",
        carId: req.params.id,
        images: newImages,
        lastError: cleanup.failed.map((item) => item.error).join("; "),
      });
    }
    throw error;
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { car }, "Images added successfully"));
});

export const replaceCarImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No images provided"));
  }
  const newImages = await uploadManyToImageKit(req.files);
  try {
    const car = await replaceCarImagesService(req.params.id, newImages);
    return res
      .status(200)
      .json(new ApiResponse(200, { car }, "Images replaced successfully"));
  } catch (error) {
    const cleanup = await deleteManyFromImageKit(newImages);
    if (cleanup.failed.length) {
      await createImageCleanupTask({
        operationKey: `image-replace-upload-rollback:${req.params.id}:${Date.now()}`,
        operation: "upload_rollback",
        carId: req.params.id,
        images: newImages,
        lastError: cleanup.failed.map((item) => item.error).join("; "),
      });
    }
    throw error;
  }
});

// DELETE /api/cars/images/:id — remove a single image by public_id (Admin/Manager)
// Deletes from ImageKit AND the car document — never leaves an orphaned
// upload in ImageKit's dashboard.
export const removeCarImage = asyncHandler(async (req, res) => {
  const car = await removeCarImageService(req.params.id, req.body.public_id);
  return res
    .status(200)
    .json(new ApiResponse(200, { car }, "Image removed successfully"));
});

// PATCH /api/cars/images/:id/reorder — reorder existing images (Admin/Manager)
export const reorderCarImages = asyncHandler(async (req, res) => {
  const car = await reorderCarImagesService(req.params.id, req.body.order);
  return res
    .status(200)
    .json(new ApiResponse(200, { car }, "Images reordered successfully"));
});

// Step 20: GET /api/cars/featured  (optimized homepage query)
export const getFeaturedCars = asyncHandler(async (req, res) => {
  const limit = Math.min(20, parseInt(req.query.limit) || 8);
  const result = await getFeaturedCarsService(limit);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Featured cars fetched"));
});

// GET /api/cars/options — centralized dropdown options (brands, provinces,
// years, engineCC, plus the existing enum-backed fields). Public, no auth.
// NOTE: registered before GET /api/cars/:id in car.routes.js so "options"
// is never interpreted as a car ID.
export const getCarOptions = asyncHandler(async (req, res) => {
  const options = getCarOptionsService();
  return res
    .status(200)
    .json(new ApiResponse(200, options, "Car options fetched successfully"));
});

// DELETE /api/cars/:id
export const deleteCar = asyncHandler(async (req, res) => {
  const result = await deleteCarService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Car deleted successfully"));
});
