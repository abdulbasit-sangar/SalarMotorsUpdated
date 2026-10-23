import mongoose from "mongoose";
import Car from "../models/car.model.js";
import {
  uploadManyToImageKit,
  deleteManyFromImageKit,
} from "../middlewares/upload.middleware.js";
import { ApiError } from "../utils/apiHelpers.js";
import {
  FUEL_TYPE,
  BODY_TYPE,
  TRANSMISSION,
  CONDITION,
  CAR_BRANDS,
  CAR_MODELS_BY_BRAND,
  PROVINCES,
  LOCATIONS,
  SPECIAL_LOCATIONS,
  LOCATION_DUBAI,
  LOCATION_ON_THE_WAY,
  ENGINE_CC_OPTIONS,
  getCarYears,
  FEATURE_GROUPS,
  VEHICLE_FEATURES,
  CURRENCIES,
  MILEAGE_UNITS,
  MAX_CAR_IMAGES,
  MIN_IMAGES_TO_PUBLISH,
  countValidImages,
} from "../constants/car.constants.js";
import { deleteFromImageKit } from "../middlewares/upload.middleware.js";
import { createImageCleanupTask } from "./imageCleanup.service.js";
import { minImagesError, maxImagesError } from "../utils/imageRules.js";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const validateObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}: ${id}`);
  }
};

// A `province` filter value that exactly matches one of the special
// category locations ("Dubai", "From America to Herat", "From Dubai to
// Herat") is matched exactly — otherwise "Dubai" would also match "From
// Dubai to Herat" as a substring. Any other value (a normal Afghan
// province/city, or a partial search term) keeps the original
// case-insensitive substring match.
const buildProvinceFilter = (province) => {
  const escaped = province.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isSpecialLocation = SPECIAL_LOCATIONS.some(
    (loc) => loc.toLowerCase() === province.toLowerCase(),
  );
  return new RegExp(isSpecialLocation ? `^${escaped}$` : escaped, "i");
};

// Every sort ends with a unique `_id` tie-breaker so cars with equal values
// keep a deterministic order. Without it MongoDB may order ties differently
// per query, so skip/limit batches could repeat or skip cars while scrolling.
const SORT_MAP = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  mileage_low: { mileage: 1, _id: 1 },
};

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  totalCars: total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 11 — Create car (ImageKit version)
// ─────────────────────────────────────────────────────────────────────────────

export const createCarService = async (
  carData,
  files = [],
  createdBy,
  cleanupOperationKey,
  creationOperationId,
  onUploaded,
) => {
  let images = [];
  try {
    images = await uploadManyToImageKit(files);
  } catch (error) {
    const failedCleanup = error.cleanup?.failed || [];
    if (failedCleanup.length && cleanupOperationKey) {
      const task = await createImageCleanupTask({
        operationKey: cleanupOperationKey,
        operation: "upload_rollback",
        images: failedCleanup.map(({ public_id }) => ({
          public_id,
          url: "https://placeholder.invalid/cleanup",
        })),
        lastError: error.message,
      });
      error.cleanupTaskId = task?._id;
    }
    throw error;
  }
  try {
    // Defense in depth: the route already rejected < MIN_IMAGES_TO_PUBLISH
    // files before any upload. This re-checks the images that were actually
    // uploaded and attached; being inside this try block means a failure here
    // rolls the uploads back like any other creation failure.
    const attached = countValidImages(images);
    if (attached < MIN_IMAGES_TO_PUBLISH) throw minImagesError(attached);

    // createdBy always comes from the authenticated JWT user (req.admin._id)
    // — it is never read from carData/client input. See car.controller.js.
    const car = await Car.create({
      ...carData,
      images,
      createdBy,
      ...(creationOperationId && { creationOperationId }),
    });

    // This is recovery metadata only. It must not delay the successful Car
    // response or turn a saved listing into a reported failure.
    if (onUploaded) {
      onUploaded(images).catch((metadataError) => {
        console.error(
          "[createCarService] Could not record uploaded images:",
          metadataError.message,
        );
      });
    }

    return car;
  } catch (error) {
    const cleanup = await deleteManyFromImageKit(images);
    if (cleanup.failed.length && cleanupOperationKey) {
      const task = await createImageCleanupTask({
        operationKey: cleanupOperationKey,
        operation: "upload_rollback",
        images,
        lastError: cleanup.failed.map((item) => item.error).join("; "),
      });
      error.cleanupTaskId = task?._id;
    }
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 12 — Get all visible cars (paginated + sorted)
// ─────────────────────────────────────────────────────────────────────────────
//
// SPONSORED VS COMMON LISTINGS — bug fix:
// Previously this had no `featured` filter at all, so a car marked
// Sponsored/Featured showed up here (the general/common listing — powers
// the homepage "recent" grid and, via getAdminCars, is also reused for the
// admin listing) AND in the dedicated Sponsored section
// (getFeaturedCarsService), duplicating it. The business rule is that a
// vehicle belongs to exactly one category at a time: the public path now
// explicitly excludes featured cars so they only ever appear via the
// Sponsored endpoint. The ADMIN path (includeHidden=true) intentionally
// does NOT exclude featured — admins/managers must see and manage every
// listing regardless of category.
export const getAllCarsService = async (query = {}, includeHidden = false) => {
  const { page, limit, skip } = parsePagination(query);
  const sortOption = SORT_MAP[query.sort] || SORT_MAP.newest;
  const filter = includeHidden
    ? {}
    : { isHidden: false, featured: { $ne: true } };

  const [cars, totalCars] = await Promise.all([
    Car.find(filter)
      .select(
        "title brand model year price currency mileage mileageUnit province images featured isSold features slug createdAt isHidden",
      )
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Car.countDocuments(filter),
  ]);

  return { cars, pagination: buildPagination(page, limit, totalCars) };
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 13 — Get single car by ID
// ─────────────────────────────────────────────────────────────────────────────

export const getCarByIdService = async (id) => {
  validateObjectId(id, "car ID");

  // Seller Information now lives directly on the car (sellerPhone/
  // sellerWhatsapp/sellerLocation — see car.model.js), so no populate is
  // needed to show it on the details page.
  const car = await Car.findOne({ _id: id, isHidden: false })
    .select("-__v")
    .lean();

  if (!car) throw new ApiError(404, "Car not found");
  return car;
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 14 — Keyword search
// ─────────────────────────────────────────────────────────────────────────────

export const searchCarsService = async (query = {}) => {
  const { keyword = "" } = query;
  const { page, limit, skip } = parsePagination(query);

  if (!keyword.trim()) throw new ApiError(400, "Search keyword is required");

  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  // VIN search: exact-ish match (case-insensitive) alongside the existing
  // fuzzy text fields — a VIN is looked up as a whole/partial code, not a
  // free-text phrase, but reuses the same regex so partial VIN fragments
  // still match.
  const filter = {
    isHidden: false,
    featured: { $ne: true }, // keep search results consistent with the "exactly one category" rule
    $or: [
      { brand: regex },
      { model: regex },
      { province: regex },
      { title: regex },
      { vin: regex },
    ],
  };

  const [cars, totalCars] = await Promise.all([
    Car.find(filter)
      .select(
        "title brand model year price currency mileage mileageUnit province images featured isSold slug createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Car.countDocuments(filter),
  ]);

  return { cars, pagination: buildPagination(page, limit, totalCars), keyword };
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 15 — Dynamic filtering
// ─────────────────────────────────────────────────────────────────────────────

export const filterCarsService = async (query = {}) => {
  const {
    brand,
    model,
    province,
    fuelType,
    bodyType,
    transmission,
    condition,
    color,
    engineCC,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    minMileage,
    maxMileage,
  } = query;

  const { page, limit, skip } = parsePagination(query);
  const sortOption = SORT_MAP[query.sort] || SORT_MAP.newest;
  // Excludes featured/sponsored cars — same "exactly one category" rule as
  // getAllCarsService (see comment there for the full bug explanation).
  const filter = {
    isHidden: false,
    ...(query.includeFeatured === "true" ? {} : { featured: { $ne: true } }),
  };

  if (brand)
    filter.brand = new RegExp(
      brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  if (model)
    filter.model = new RegExp(
      model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  if (province) filter.province = buildProvinceFilter(province);
  if (fuelType) filter.fuelType = fuelType;
  if (bodyType) filter.bodyType = bodyType;
  if (transmission) filter.transmission = transmission;
  if (condition) filter.condition = condition;
  if (color)
    filter.color = new RegExp(
      color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );

  // engineCC is a plain Number field (not a Mongoose enum — see car.model.js),
  // so validate it as a finite, non-negative number before it ever reaches
  // the MongoDB query rather than trusting the raw query string.
  if (engineCC !== undefined && engineCC !== "") {
    const parsedEngineCC = Number(engineCC);
    if (Number.isFinite(parsedEngineCC) && parsedEngineCC >= 0) {
      filter.engineCC = parsedEngineCC;
    }
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (minYear || maxYear) {
    filter.year = {};
    if (minYear) filter.year.$gte = Number(minYear);
    if (maxYear) filter.year.$lte = Number(maxYear);
  }

  if (minMileage || maxMileage) {
    filter.mileage = {};
    if (minMileage) filter.mileage.$gte = Number(minMileage);
    if (maxMileage) filter.mileage.$lte = Number(maxMileage);
  }

  const [cars, totalCars] = await Promise.all([
    Car.find(filter)
      .select(
        "title brand model year price currency mileage mileageUnit province fuelType bodyType images featured isSold slug createdAt",
      )
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Car.countDocuments(filter),
  ]);

  return {
    cars,
    pagination: buildPagination(page, limit, totalCars),
    appliedFilters: filter,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 18 — Similar cars recommendation
// ─────────────────────────────────────────────────────────────────────────────

export const getSimilarCarsService = async (id) => {
  validateObjectId(id, "car ID");

  const source = await Car.findOne({ _id: id, isHidden: false })
    .select("brand model price")
    .lean();

  if (!source) throw new ApiError(404, "Car not found");

  const priceMargin = source.price * 0.3;

  const filter = {
    isHidden: false,
    featured: { $ne: true }, // don't recommend a sponsored car as a "similar" one — keeps categories separate
    _id: { $ne: source._id },
    brand: source.brand,
    price: {
      $gte: source.price - priceMargin,
      $lte: source.price + priceMargin,
    },
  };

  const cars = await Car.find(filter)
    .select(
      "title brand model year price currency mileage mileageUnit province images featured isSold slug",
    )
    .limit(6)
    .lean();

  return { cars, source: { brand: source.brand, price: source.price } };
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 19 — Feature & hide car (admin toggles)
// ─────────────────────────────────────────────────────────────────────────────

export const toggleFeatureCarService = async (id) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("featured");
  if (!car) throw new ApiError(404, "Car not found");

  const updated = await Car.findByIdAndUpdate(
    id,
    { $set: { featured: !car.featured } },
    { new: true, select: "title featured isHidden" },
  ).lean();

  return updated;
};

const HIDE_TOGGLE_SELECT = "title featured isHidden";

// Hiding is never gated. Un-hiding IS the publication boundary for an
// existing listing (hidden → visible), so it requires MIN_IMAGES_TO_PUBLISH
// valid attached images. The final write re-checks the image count
// atomically in the same query, so an image removed between our read and
// the update cannot slip a short listing through.
export const toggleHideCarService = async (id) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("isHidden images");
  if (!car) throw new ApiError(404, "Car not found");

  if (!car.isHidden) {
    return Car.findByIdAndUpdate(
      id,
      { $set: { isHidden: true } },
      { new: true, select: HIDE_TOGGLE_SELECT },
    ).lean();
  }

  const validCount = countValidImages(car.images);
  if (validCount < MIN_IMAGES_TO_PUBLISH) throw minImagesError(validCount);

  const updated = await Car.findOneAndUpdate(
    {
      _id: id,
      isHidden: true,
      [`images.${MIN_IMAGES_TO_PUBLISH - 1}`]: { $exists: true },
    },
    { $set: { isHidden: false } },
    { new: true, select: HIDE_TOGGLE_SELECT },
  ).lean();
  if (updated) return updated;

  // The guarded update matched nothing: the listing changed after our read.
  const fresh = await Car.findById(id).select(HIDE_TOGGLE_SELECT + " images");
  if (!fresh) throw new ApiError(404, "Car not found");
  if (!fresh.isHidden) return fresh.toObject(); // someone else already published it
  const freshCount = countValidImages(fresh.images);
  if (freshCount < MIN_IMAGES_TO_PUBLISH) throw minImagesError(freshCount);
  throw new ApiError(409, "Listing changed while publishing. Please try again.");
};

// ─────────────────────────────────────────────────────────────────────────────
// SOLD VEHICLE INDICATOR — Admin/Manager toggle
// ─────────────────────────────────────────────────────────────────────────────

export const toggleSoldCarService = async (id) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("isSold");
  if (!car) throw new ApiError(404, "Car not found");

  const updated = await Car.findByIdAndUpdate(
    id,
    { $set: { isSold: !car.isSold } },
    { new: true, select: "title isSold isHidden featured" },
  ).lean();

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLE FEATURES SYSTEM — Admin/Manager update
// ─────────────────────────────────────────────────────────────────────────────
// Values already validated against VEHICLE_FEATURES by validateUpdateFeatures
// (car.validator.js) before this ever runs — this service just persists them.
export const updateCarFeaturesService = async (id, features = []) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("_id");
  if (!car) throw new ApiError(404, "Car not found");

  const updated = await Car.findByIdAndUpdate(
    id,
    { $set: { features } },
    { new: true, select: "title features" },
  ).lean();

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN/MANAGER — full listing edit
// ─────────────────────────────────────────────────────────────────────────────

// Admin fetch of a single listing INCLUDING hidden ones (the public
// getCarByIdService deliberately excludes hidden listings). Used to prefill
// the Edit Vehicle form.
export const getAdminCarByIdService = async (id) => {
  validateObjectId(id, "car ID");
  const car = await Car.findById(id).select("-__v").lean();
  if (!car) throw new ApiError(404, "Car not found");
  return car;
};

// Fields an admin may change through PATCH /api/cars/:id. Images, featured,
// isHidden, isSold, slug and createdBy are intentionally NOT editable here —
// they have their own dedicated, separately guarded endpoints.
const EDITABLE_CAR_FIELDS = [
  "title",
  "brand",
  "model",
  "year",
  "price",
  "currency",
  "province",
  "city",
  "mileage",
  "mileageUnit",
  "fuelType",
  "bodyType",
  "transmission",
  "condition",
  "engineCC",
  "color",
  "vin",
  "sellerPhone",
  "sellerWhatsapp",
  "sellerLocation",
  "description",
  "importedDate",
];

// An empty string means "clear this optional value".
const CLEARABLE_CAR_FIELDS = new Set([
  "city",
  "fuelType",
  "bodyType",
  "transmission",
  "engineCC",
  "color",
  "vin",
  "sellerPhone",
  "sellerWhatsapp",
  "sellerLocation",
  "description",
  "importedDate",
]);

export const updateCarService = async (id, data = {}) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id);
  if (!car) throw new ApiError(404, "Car not found");

  // Only fields that were actually sent are touched, so omitted fields (and
  // images/status flags) are never reset. Using document.save() (rather than
  // an update query) keeps the schema validators, setters and the slug
  // pre-save hook in play, and Mongoose only writes the modified paths — so
  // a concurrent image change is not overwritten.
  for (const key of EDITABLE_CAR_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const value = data[key];

    if (value === "" || value === null) {
      if (CLEARABLE_CAR_FIELDS.has(key)) car.set(key, undefined);
      else if (key === "mileage") car.set(key, 0); // schema default
      continue; // required fields are never blanked
    }
    car.set(key, value);
  }

  if (Array.isArray(data.features)) {
    car.features = [...new Set(data.features)];
  }

  await car.save();

  const updated = car.toObject();
  delete updated.__v;
  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN/MANAGER IMAGE EDITING — add and remove images on an existing listing
// ─────────────────────────────────────────────────────────────────────────────

// Cheap pre-flight used by the controller BEFORE uploading to ImageKit, so an
// over-limit request fails fast without spending upload quota. It is only an
// early exit — addCarImagesService below re-enforces the cap atomically.
export const assertCanAddImagesService = async (id, incomingCount) => {
  validateObjectId(id, "car ID");
  const car = await Car.findById(id).select("images").lean();
  if (!car) throw new ApiError(404, "Car not found");
  const current = car.images?.length || 0;
  if (current + incomingCount > MAX_CAR_IMAGES) {
    throw maxImagesError(current, incomingCount);
  }
};

// Adds newly-uploaded images to a car's existing image list. The cap counts
// the images already attached (existing + new <= MAX_CAR_IMAGES), and is
// enforced inside the update filter itself so concurrent or repeated
// requests cannot push the total past the limit.
export const addCarImagesService = async (id, newImages = []) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("images");
  if (!car) throw new ApiError(404, "Car not found");

  if (car.images.length + newImages.length > MAX_CAR_IMAGES) {
    throw maxImagesError(car.images.length, newImages.length);
  }

  const updated = await Car.findOneAndUpdate(
    {
      _id: id,
      $expr: {
        $lte: [
          { $size: { $ifNull: ["$images", []] } },
          MAX_CAR_IMAGES - newImages.length,
        ],
      },
    },
    { $push: { images: { $each: newImages } } },
    { new: true, runValidators: true, select: "title images" },
  ).lean();

  if (!updated) {
    // Lost a race with another add — report the real, current numbers.
    const fresh = await Car.findById(id).select("images").lean();
    if (!fresh) throw new ApiError(404, "Car not found");
    throw maxImagesError(fresh.images?.length || 0, newImages.length);
  }

  return updated;
};

// Removes a single image by its ImageKit public_id — deletes it from
// ImageKit AND from the car document. The database is changed only after
// ImageKit confirms deletion, so a transient ImageKit failure can be retried
// without losing the reference to the file.
export const removeCarImageService = async (id, publicId) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("images");
  if (!car) throw new ApiError(404, "Car not found");

  const target = car.images.find((img) => img.public_id === publicId);
  if (!target) return car;

  const cleanup = await deleteManyFromImageKit([target]);
  if (cleanup.failed.length) {
    await createImageCleanupTask({
      operationKey: `image-delete:${id}:${publicId}`,
      operation: "image_delete",
      carId: id,
      imagePublicId: publicId,
      images: [target],
      lastError: cleanup.failed[0].error,
    });
    throw new ApiError(
      503,
      "Image deletion is pending because ImageKit did not confirm cleanup",
    );
  }

  let updated;
  try {
    updated = await Car.findByIdAndUpdate(
      id,
      { $pull: { images: { public_id: publicId } } },
      { new: true, select: "title images" },
    ).lean();
  } catch (error) {
    await createImageCleanupTask({
      operationKey: `image-delete:${id}:${publicId}`,
      operation: "image_delete",
      carId: id,
      imagePublicId: publicId,
      images: [target],
      lastError: error.message,
    });
    throw error;
  }

  return updated;
};

export const replaceCarImagesService = async (id, newImages = []) => {
  validateObjectId(id, "car ID");
  const car = await Car.findById(id).select("images");
  if (!car) throw new ApiError(404, "Car not found");
  if (!newImages.length || newImages.length > MAX_CAR_IMAGES) {
    throw new ApiError(
      400,
      `Provide between 1 and ${MAX_CAR_IMAGES} images`,
    );
  }

  const oldImages = car.images;
  const updated = await Car.findByIdAndUpdate(
    id,
    { $set: { images: newImages } },
    { new: true, runValidators: true, select: "title images" },
  ).lean();

  const cleanup = await deleteManyFromImageKit(oldImages);
  for (const failed of cleanup.failed) {
    await createImageCleanupTask({
      operationKey: `image-replace:${id}:${failed.public_id}`,
      operation: "image_delete",
      carId: id,
      imagePublicId: failed.public_id,
      images: oldImages.filter((image) => image.public_id === failed.public_id),
      lastError: failed.error,
    });
  }
  return updated;
};

// Reorders a car's images to match the given list of public_ids (the new
// display order). Every existing public_id must be present exactly once —
// this only reorders, it never adds/drops images (use the add/remove
// endpoints for that), which keeps the operation unambiguous.
export const reorderCarImagesService = async (id, orderedPublicIds = []) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("images");
  if (!car) throw new ApiError(404, "Car not found");

  const currentIds = car.images.map((img) => img.public_id);
  const sameSet =
    currentIds.length === orderedPublicIds.length &&
    currentIds.every((id) => orderedPublicIds.includes(id));

  if (!sameSet) {
    throw new ApiError(
      400,
      "Reorder list must contain exactly the car's existing images",
    );
  }

  const byId = new Map(car.images.map((img) => [img.public_id, img]));
  const reordered = orderedPublicIds.map((pid) => byId.get(pid));

  const updated = await Car.findByIdAndUpdate(
    id,
    { $set: { images: reordered } },
    { new: true, select: "title images" },
  ).lean();

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 20 — Featured cars (optimized homepage query)
// ─────────────────────────────────────────────────────────────────────────────

export const getFeaturedCarsService = async (limitNum = 8) => {
  const cars = await Car.find({ isHidden: false, featured: true })
    .select(
      "title brand model year price currency mileage mileageUnit province images featured isSold slug",
    )
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .lean();

  return { cars };
};

// ─────────────────────────────────────────────────────────────────────────────
// Car dropdown options — single source of truth is car.constants.js.
// Powers GET /api/cars/options so the frontend never hardcodes these lists.
// ─────────────────────────────────────────────────────────────────────────────

export const getCarOptionsService = () => ({
  brands: CAR_BRANDS,
  modelsByBrand: CAR_MODELS_BY_BRAND,
  // Full flat list (Afghan provinces/cities + special locations) — kept for
  // any existing consumer that just wants "every selectable location" as
  // one list (e.g. the Province filter in FilterPanel).
  provinces: LOCATIONS,
  // Same values, grouped — used by the Create/Edit Listing Location
  // dropdown to show Afghan provinces separately from the Dubai Cars/On
  // The Way categories via <optgroup>.
  locationGroups: {
    provinces: PROVINCES,
    specialLocations: SPECIAL_LOCATIONS,
  },
  years: getCarYears(),
  engineCC: ENGINE_CC_OPTIONS,
  fuelTypes: Object.values(FUEL_TYPE),
  bodyTypes: Object.values(BODY_TYPE),
  transmissions: Object.values(TRANSMISSION),
  conditions: Object.values(CONDITION),
  featureGroups: FEATURE_GROUPS,
  features: VEHICLE_FEATURES,
  currencies: CURRENCIES,
  mileageUnits: MILEAGE_UNITS,
  // Additive: lets the admin UI mirror the backend image rules exactly.
  imageLimits: { min: MIN_IMAGES_TO_PUBLISH, max: MAX_CAR_IMAGES },
});

// ─────────────────────────────────────────────────────────────────────────────
// Delete car (removes images from ImageKit then deletes DB record)
// ─────────────────────────────────────────────────────────────────────────────

export const deleteCarService = async (id) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id);
  if (!car) return { deleted: false };

  const cleanup = await deleteManyFromImageKit(car.images);
  if (cleanup.failed.length) {
    await createImageCleanupTask({
      operationKey: `listing-delete:${id}`,
      operation: "listing_delete",
      carId: id,
      images: car.images,
      lastError: cleanup.failed.map((item) => item.error).join("; "),
    });
    throw new ApiError(
      503,
      "Listing deletion is pending because ImageKit cleanup did not complete",
    );
  }

  try {
    await Car.findByIdAndDelete(id);
  } catch (error) {
    await createImageCleanupTask({
      operationKey: `listing-delete:${id}`,
      operation: "listing_delete",
      carId: id,
      images: car.images,
      lastError: error.message,
    });
    throw error;
  }
  return { deleted: true };
};
