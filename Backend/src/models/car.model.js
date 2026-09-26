import mongoose from "mongoose";
import {
  STEERING,
  FUEL_TYPE,
  BODY_TYPE,
  TRANSMISSION,
  CONDITION,
  CAR_BRANDS,
  LOCATIONS,
  MIN_CAR_YEAR,
  VEHICLE_FEATURES,
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  MILEAGE_UNITS,
  DEFAULT_MILEAGE_UNIT,
} from "../constants/car.constants.js";
import { generateSlug } from "../utils/slugUtils.js";

// ─── Image sub-schema ─────────────────────────────────────────────────────────
const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
      required: true, // needed to delete from ImageKit
    },
  },
  { _id: false }, // no separate _id for each image object
);

// ─── Car schema ───────────────────────────────────────────────────────────────
const carSchema = new mongoose.Schema(
  {
    // ── Core identity ──────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Car title is required"],
      trim: true,
      maxlength: [150, "Title must not exceed 150 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    creationOperationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ListingCreation",
      unique: true,
      sparse: true,
      index: true,
      select: false,
    },

    // ── Make & model ───────────────────────────────────────────────────────────
    // Validated against the centralized CAR_BRANDS list so a client can't
    // bypass the frontend dropdown and write an arbitrary brand directly
    // through the API (see car.constants.js — single source of truth,
    // also served via GET /api/cars/options).
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
      enum: {
        values: CAR_BRANDS,
        message: `Brand must be one of: ${CAR_BRANDS.join(", ")}`,
      },
      index: true, // frequently filtered
    },

    model: {
      type: String,
      required: [true, "Model is required"],
      trim: true,
      index: true, // frequently filtered
    },

    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [MIN_CAR_YEAR, `Year must be ${MIN_CAR_YEAR} or later`],
      max: [new Date().getFullYear() + 1, "Year cannot be in the future"],
      index: true,
    },

    // ── Pricing ────────────────────────────────────────────────────────────────
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      index: true, // sorted and range-filtered frequently
    },

    // Currency Selection: stored separately from the numeric price — never
    // as part of a formatted string ("$12,000") — so price math (search
    // range filters, sorting) stays on a clean Number. Defaults to USD so
    // every pre-existing listing (created before this field existed) reads
    // correctly with no migration needed.
    currency: {
      type: String,
      enum: {
        values: CURRENCY_CODES,
        message: `Currency must be one of: ${CURRENCY_CODES.join(", ")}`,
      },
      default: DEFAULT_CURRENCY,
    },

    // ── Specs ──────────────────────────────────────────────────────────────────
    mileage: {
      type: Number,
      min: [0, "Mileage cannot be negative"],
      default: 0,
    },

    // Mileage Unit: stored separately from the numeric mileage — same
    // rationale as `currency` above. Defaults to "km" (the unit every
    // pre-existing listing was implicitly created in).
    mileageUnit: {
      type: String,
      enum: {
        values: MILEAGE_UNITS,
        message: `Mileage unit must be one of: ${MILEAGE_UNITS.join(", ")}`,
      },
      default: DEFAULT_MILEAGE_UNIT,
    },

    fuelType: {
      type: String,
      enum: {
        values: Object.values(FUEL_TYPE),
        message: `Fuel type must be one of: ${Object.values(FUEL_TYPE).join(", ")}`,
      },
      index: true,
    },

    bodyType: {
      type: String,
      enum: {
        values: Object.values(BODY_TYPE),
        message: `Body type must be one of: ${Object.values(BODY_TYPE).join(", ")}`,
      },
      index: true,
    },

    transmission: {
      type: String,
      enum: {
        values: Object.values(TRANSMISSION),
        message: `Transmission must be one of: ${Object.values(TRANSMISSION).join(", ")}`,
      },
    },

    steeringType: {
      type: String,
      enum: {
        values: Object.values(STEERING),
        message: `Steering type must be RHD or LHD`,
      },
      required: [true, "Steering type is required"],
      index: true, // dedicated endpoints filter by this
    },

    condition: {
      type: String,
      enum: {
        values: Object.values(CONDITION),
        message: `Condition must be one of: ${Object.values(CONDITION).join(", ")}`,
      },
      default: CONDITION.USED,
    },

    engineCC: {
      type: Number,
      min: [0, "Engine CC cannot be negative"],
    },

    color: {
      type: String,
      trim: true,
    },

    // VIN / Vehicle Identification Number — optional (older/local listings
    // may not have one), but validated when present: real VINs are 17
    // alphanumeric characters excluding I/O/Q (easily confused with 1/0),
    // though some markets/older vehicles use shorter codes, so this accepts
    // 5–17 characters of that alphabet rather than hard-requiring exactly
    // 17. Stored uppercase for consistent search/display. `sparse: true` so
    // the unique-ish nature of a VIN doesn't collide with the many existing
    // listings that have none.
    vin: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[A-HJ-NPR-Z0-9]{5,17}$/,
        "VIN must be 5–17 characters (letters and numbers, excluding I, O, and Q)",
      ],
      index: true,
      sparse: true,
    },

    // ── Seller Information (moved from the Admin profile to the listing
    // itself — see PATCH history: previously Car.createdBy -> Admin.phone/
    // location; now each listing carries its own seller contact so a
    // single admin/manager can list vehicles for different sellers) ───────────
    sellerPhone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number must not exceed 20 characters"],
    },

    sellerWhatsapp: {
      type: String,
      trim: true,
      maxlength: [20, "WhatsApp number must not exceed 20 characters"],
    },

    sellerLocation: {
      type: String,
      trim: true,
      maxlength: [100, "Location must not exceed 100 characters"],
    },

    // ── Location ───────────────────────────────────────────────────────────────
    // Validated against the centralized LOCATIONS list — Afghan
    // provinces/cities (PROVINCES) plus the special "Dubai Cars" / "On The
    // Way" category values (SPECIAL_LOCATIONS). Same rationale as `brand`
    // above; see car.constants.js for how these special values drive
    // catalog categorization.
    province: {
      type: String,
      required: [true, "Province is required"],
      trim: true,
      enum: {
        values: LOCATIONS,
        message: `Location must be one of: ${LOCATIONS.join(", ")}`,
      },
      index: true,
    },

    city: {
      type: String,
      trim: true,
    },

    // ── Import info ────────────────────────────────────────────────────────────
    importedDate: {
      type: Date,
    },

    // ── Description ────────────────────────────────────────────────────────────
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description must not exceed 2000 characters"],
    },

    // ── Images ─────────────────────────────────────────────────────────────────
    images: {
      type: [imageSchema],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "A car can have a maximum of 10 images",
      },
      default: [],
    },

    // ── Admin content management flags ────────────────────────────────────────
    featured: {
      type: Boolean,
      default: false,
      index: true, // homepage query filters by this
    },

    isHidden: {
      type: Boolean,
      default: false,
      index: true, // ALL public queries filter by this
    },

    // Sold Vehicle Indicator: set only via PATCH /api/cars/sold/:id
    // (Admin/Manager only — see toggleSoldCarService). Not marked `required`
    // so existing listings created before this feature default to `false`
    // without any manual migration.
    isSold: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Vehicle Features System: a structured array of feature identifiers,
    // validated against the centralized VEHICLE_FEATURES list (see
    // car.constants.js — same rationale as `brand`/`province` above). A
    // plain string array was chosen over dozens of boolean fields per the
    // spec — easy to extend by editing FEATURE_GROUPS in one place, and old
    // listings without this field simply default to an empty array.
    features: {
      type: [String],
      enum: {
        values: VEHICLE_FEATURES,
        message: `Feature must be one of the supported vehicle features`,
      },
      default: [],
      validate: {
        validator: (arr) => arr.length <= 60,
        message: "Too many features selected",
      },
    },

    // Manager/Sub-Admin RBAC: tracks which admin/manager created this
    // listing. Always set by the backend from the authenticated JWT user
    // (req.admin._id) — never trusted from client input (see
    // car.controller.js / createCarService). NOT marked `required` at the
    // schema level so listings created before this feature was added
    // continue to load and save without any manual migration.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// ─── Compound indexes for common query combinations ───────────────────────────
carSchema.index({ brand: 1, steeringType: 1 });
carSchema.index({ brand: 1, price: 1 });
carSchema.index({ isHidden: 1, featured: 1 });
carSchema.index({ isHidden: 1, createdAt: -1 });
carSchema.index({ isHidden: 1, isSold: 1 });
// Covers isHidden/featured/steeringType combination queries — e.g. the
// Steering Type filter on Browse (/cars/filter), which always applies the
// isHidden/featured exclusion alongside it.
carSchema.index({ isHidden: 1, featured: 1, steeringType: 1 });

// ─── Pre-save hook: auto-generate slug from title + partial _id ───────────────
carSchema.pre("save", async function (next) {
  if (!this.isModified("title") && this.slug) return next();

  const base = generateSlug(this.title);
  const suffix = this._id.toString().slice(-6); // last 6 chars of ObjectId for uniqueness
  this.slug = `${base}-${suffix}`;
  next();
});

const Car = mongoose.model("Car", carSchema);

export default Car;
