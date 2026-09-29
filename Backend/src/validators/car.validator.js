import Joi from "joi";
import { ApiError } from "../utils/apiHelpers.js";
import {
  FUEL_TYPE,
  BODY_TYPE,
  TRANSMISSION,
  CONDITION,
  CAR_BRANDS,
  LOCATIONS,
  MIN_CAR_YEAR,
  VEHICLE_FEATURES,
  CURRENCY_CODES,
  MILEAGE_UNITS,
} from "../constants/car.constants.js";

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{5,17}$/i;

// ─── Reusable field definitions ───────────────────────────────────────────────
const fields = {
  title: Joi.string()
    .trim()
    .max(150)
    .messages({ "string.max": "Title must not exceed 150 characters" }),
  // Validated against the centralized lists — mirrors the Mongoose enum in
  // car.model.js so a bad request is rejected before it ever reaches the DB.
  brand: Joi.string()
    .trim()
    .valid(...CAR_BRANDS)
    .messages({ "any.only": `Brand must be one of: ${CAR_BRANDS.join(", ")}` }),
  model: Joi.string().trim(),
  year: Joi.number()
    .integer()
    .min(MIN_CAR_YEAR)
    .max(new Date().getFullYear() + 1)
    .messages({ "number.min": `Year must be ${MIN_CAR_YEAR} or later` }),
  price: Joi.number()
    .min(0)
    .messages({ "number.min": "Price cannot be negative" }),
  // Currency Selection — must be one of the supported codes (car.constants.js)
  currency: Joi.string()
    .valid(...CURRENCY_CODES)
    .messages({
      "any.only": `Currency must be one of: ${CURRENCY_CODES.join(", ")}`,
    }),
  province: Joi.string()
    .trim()
    .valid(...LOCATIONS)
    .messages({
      "any.only": `Location must be one of: ${LOCATIONS.join(", ")}`,
    }),
  city: Joi.string().trim(),
  mileage: Joi.number().min(0),
  // Mileage Unit — KM or Miles (car.constants.js)
  mileageUnit: Joi.string()
    .valid(...MILEAGE_UNITS)
    .messages({
      "any.only": `Mileage unit must be one of: ${MILEAGE_UNITS.join(", ")}`,
    }),
  fuelType: Joi.string().valid(...Object.values(FUEL_TYPE)),
  bodyType: Joi.string().valid(...Object.values(BODY_TYPE)),
  transmission: Joi.string().valid(...Object.values(TRANSMISSION)),
  condition: Joi.string().valid(...Object.values(CONDITION)),
  engineCC: Joi.number().min(0),
  color: Joi.string().trim(),
  // VIN — optional; when present must look like a real VIN. Uppercased to
  // match the Mongoose schema's storage format (case-insensitive input).
  vin: Joi.string().trim().uppercase().pattern(VIN_PATTERN).allow("").messages({
    "string.pattern.base":
      "VIN must be 5–17 characters (letters and numbers, excluding I, O, and Q)",
  }),
  // Seller Information — now per-listing rather than per-account (spec
  // requirement #1). All optional so listings can omit any of them.
  sellerPhone: Joi.string()
    .trim()
    .allow("")
    .max(20)
    .pattern(/^[+\d][\d\s()-]*$/)
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  sellerWhatsapp: Joi.string()
    .trim()
    .allow("")
    .max(20)
    .pattern(/^[+\d][\d\s()-]*$/)
    .messages({
      "string.pattern.base": "Please provide a valid WhatsApp number",
    }),
  sellerLocation: Joi.string().trim().allow("").max(100),
  description: Joi.string().trim().max(2000),
  importedDate: Joi.date(),
  // Vehicle Features System — every value must be one of the centralized
  // VEHICLE_FEATURES list (car.constants.js). Never trust arbitrary feature
  // strings from the client (spec requirement #4).
  features: Joi.array()
    .items(Joi.string().valid(...VEHICLE_FEATURES))
    .max(60),
};

// ─── Create car schema — all required fields enforced ─────────────────────────
const createCarSchema = Joi.object({
  title: fields.title
    .required()
    .messages({ "any.required": "Title is required" }),
  brand: fields.brand
    .required()
    .messages({ "any.required": "Brand is required" }),
  model: fields.model
    .required()
    .messages({ "any.required": "Model is required" }),
  year: fields.year.required().messages({ "any.required": "Year is required" }),
  price: fields.price
    .required()
    .messages({ "any.required": "Price is required" }),
  currency: fields.currency.optional(),
  province: fields.province
    .required()
    .messages({ "any.required": "Province is required" }),
  // Optional fields
  city: fields.city.optional(),
  mileage: fields.mileage.optional(),
  mileageUnit: fields.mileageUnit.optional(),
  fuelType: fields.fuelType.optional(),
  bodyType: fields.bodyType.optional(),
  transmission: fields.transmission.optional(),
  condition: fields.condition.optional(),
  engineCC: fields.engineCC.optional(),
  color: fields.color.optional(),
  vin: fields.vin.optional(),
  sellerPhone: fields.sellerPhone.optional(),
  sellerWhatsapp: fields.sellerWhatsapp.optional(),
  sellerLocation: fields.sellerLocation.optional(),
  description: fields.description.optional(),
  importedDate: fields.importedDate.optional(),
  features: fields.features.optional(),
});

// ─── Update car schema — all fields optional (PATCH semantics) ────────────────
const updateCarSchema = Joi.object({
  title: fields.title.optional(),
  brand: fields.brand.optional(),
  model: fields.model.optional(),
  year: fields.year.optional(),
  price: fields.price.optional(),
  currency: fields.currency.optional(),
  province: fields.province.optional(),
  city: fields.city.optional(),
  mileage: fields.mileage.optional(),
  mileageUnit: fields.mileageUnit.optional(),
  fuelType: fields.fuelType.optional(),
  bodyType: fields.bodyType.optional(),
  transmission: fields.transmission.optional(),
  condition: fields.condition.optional(),
  engineCC: fields.engineCC.optional(),
  color: fields.color.optional(),
  vin: fields.vin.optional(),
  sellerPhone: fields.sellerPhone.optional(),
  sellerWhatsapp: fields.sellerWhatsapp.optional(),
  sellerLocation: fields.sellerLocation.optional(),
  description: fields.description.optional(),
  importedDate: fields.importedDate.optional(),
})
  .min(1)
  .messages({ "object.min": "At least one field must be provided for update" });

// ─── Update features schema — used standalone by PATCH /cars/features/:id ─────
const updateFeaturesSchema = Joi.object({
  features: fields.features.required().messages({
    "any.required": "Features array is required",
  }),
});

// ─── Remove image schema — used by DELETE /cars/images/:id ────────────────────
const removeImageSchema = Joi.object({
  public_id: Joi.string().trim().required().messages({
    "any.required": "public_id is required",
  }),
});

// ─── Middleware factory ────────────────────────────────────────────────────────
const validate =
  (schema, stripLegacyField = false) =>
  (req, res, next) => {
    if (stripLegacyField && req.body && typeof req.body === "object") {
      delete req.body.steeringType;
    }

    const { error } = schema.validate(req.body, {
      abortEarly: false, // collect ALL errors, not just the first
      allowUnknown: false, // reject unexpected fields (no garbage data in DB)
      stripUnknown: true, // silently remove unknown fields that passed
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return next(new ApiError(400, "Validation failed", messages));
    }

    next();
  };

export const validateCreateCar = validate(createCarSchema, true);
export const validateUpdateCar = validate(updateCarSchema, true);
export const validateUpdateFeatures = validate(updateFeaturesSchema);
export const validateRemoveImage = validate(removeImageSchema);

// ─── Parse `features` from multipart form-data ─────────────────────────────────
// Create Listing sends images as multipart/form-data, so the `features`
// field arrives as a plain string (a JSON-encoded array) rather than a real
// array — multer doesn't parse JSON inside text fields. This runs BEFORE
// validateCreateCar so Joi validates an actual array, not a string.
export const parseFeaturesField = (req, res, next) => {
  if (typeof req.body.features === "string") {
    try {
      const parsed = JSON.parse(req.body.features);
      req.body.features = Array.isArray(parsed) ? parsed : [];
    } catch {
      req.body.features = [];
    }
  }
  next();
};
