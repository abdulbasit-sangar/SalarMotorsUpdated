import mongoose from "mongoose";
import Car from "../models/car.model.js";
import {
  uploadManyToImageKit,
  deleteManyFromImageKit,
} from "../middlewares/upload.middleware.js";
import { ApiError } from "../utils/apiHelpers.js";
import {
  STEERING,
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
} from "../constants/car.constants.js";
import { deleteFromImageKit } from "../middlewares/upload.middleware.js";
import { createImageCleanupTask } from "./imageCleanup.service.js";

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

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  mileage_low: { mileage: 1 },
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
        "title brand model year price currency mileage mileageUnit province steeringType images featured isSold features slug createdAt isHidden",
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
        "title brand model year price currency mileage mileageUnit province steeringType images featured isSold slug createdAt",
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
    steeringType,
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
  if (steeringType) filter.steeringType = steeringType;
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
        "title brand model year price currency mileage mileageUnit province steeringType fuelType bodyType images featured isSold slug createdAt",
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
    .select("brand model price steeringType")
    .lean();

  if (!source) throw new ApiError(404, "Car not found");

  const priceMargin = source.price * 0.3;

  const filter = {
    isHidden: false,
    featured: { $ne: true }, // don't recommend a sponsored car as a "similar" one — keeps categories separate
    _id: { $ne: source._id },
    brand: source.brand,
    steeringType: source.steeringType,
    price: {
      $gte: source.price - priceMargin,
      $lte: source.price + priceMargin,
    },
  };

  const cars = await Car.find(filter)
    .select(
      "title brand model year price currency mileage mileageUnit province steeringType images featured isSold slug",
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

export const toggleHideCarService = async (id) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("isHidden");
  if (!car) throw new ApiError(404, "Car not found");

  const updated = await Car.findByIdAndUpdate(
    id,
    { $set: { isHidden: !car.isHidden } },
    { new: true, select: "title featured isHidden" },
  ).lean();

  return updated;
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
// ADMIN/MANAGER IMAGE EDITING — add and remove images on an existing listing
// ─────────────────────────────────────────────────────────────────────────────

// Adds one or more newly-uploaded images to a car's existing image list.
// Enforces the same 10-image cap the schema validates on save, but checked
// here first so we don't waste an ImageKit upload only to have Mongoose
// reject the save (uploads already happened in the controller by the time
// this runs, but this still gives a clean error instead of a confusing one).
export const addCarImagesService = async (id, newImages = []) => {
  validateObjectId(id, "car ID");

  const car = await Car.findById(id).select("images");
  if (!car) throw new ApiError(404, "Car not found");

  if (car.images.length + newImages.length > 10) {
    throw new ApiError(400, "A car can have a maximum of 10 images");
  }

  const updated = await Car.findByIdAndUpdate(
    id,
    { $push: { images: { $each: newImages } } },
    { new: true, runValidators: true, select: "title images" },
  ).lean();

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
  if (!newImages.length || newImages.length > 10) {
    throw new ApiError(400, "Provide between 1 and 10 images");
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
      "title brand model year price currency mileage mileageUnit province steeringType images featured isSold slug",
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
  steering: Object.values(STEERING),
  fuelTypes: Object.values(FUEL_TYPE),
  bodyTypes: Object.values(BODY_TYPE),
  transmissions: Object.values(TRANSMISSION),
  conditions: Object.values(CONDITION),
  featureGroups: FEATURE_GROUPS,
  features: VEHICLE_FEATURES,
  currencies: CURRENCIES,
  mileageUnits: MILEAGE_UNITS,
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
