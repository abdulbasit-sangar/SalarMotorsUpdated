import { Router } from "express";
import {
  createCar,
  getAllCars,
  getAdminCars,
  getCarById,
  searchCars,
  filterCars,
  getSimilarCars,
  toggleFeatureCar,
  toggleHideCar,
  toggleSoldCar,
  updateCarFeatures,
  addCarImages,
  removeCarImage,
  replaceCarImages,
  reorderCarImages,
  getFeaturedCars,
  deleteCar,
  getCarOptions,
  getCreationStatus,
} from "../controllers/car.controller.js";
import { verifyJWT, requireRole } from "../middlewares/auth.middleware.js";
import {
  uploadMultiple,
  handleUploadErrors,
} from "../middlewares/upload.middleware.js";
import {
  validateCreateCar,
  validateUpdateFeatures,
  validateRemoveImage,
  parseFeaturesField,
} from "../validators/car.validator.js";
import {
  uploadLimiter,
  searchLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: named routes MUST come before /:id
// ─────────────────────────────────────────────────────────────────────────────

// Public — named routes
router.get("/featured", getFeaturedCars);
router.get("/options", getCarOptions); // MUST stay before GET /:id
router.get("/search", searchLimiter, searchCars); // stricter limit on regex search
router.get("/filter", searchLimiter, filterCars); // stricter limit on filter queries

// Public — root + parameterized
router.get("/", getAllCars);
router.get("/similar/:id", getSimilarCars);

// Admin/Manager — list all cars including hidden
router.get(
  "/admin",
  verifyJWT,
  requireRole("superadmin", "manager"),
  getAdminCars,
);

router.get(
  "/creation-status/:key",
  verifyJWT,
  requireRole("superadmin", "manager"),
  getCreationStatus,
);

router.get("/:id", getCarById);

// Admin/Manager — create car
// uploadLimiter: max 30 uploads/hour per IP — protects ImageKit quota
router.post(
  "/",
  verifyJWT,
  requireRole("superadmin", "manager"),
  uploadLimiter,
  uploadMultiple,
  handleUploadErrors,
  parseFeaturesField, // features arrives as a JSON string inside multipart form-data
  validateCreateCar,
  createCar,
);

// Superadmin only — feature/unfeature (managers cannot feature listings)
router.patch(
  "/feature/:id",
  verifyJWT,
  requireRole("superadmin"),
  toggleFeatureCar,
);
// Admin/Manager — hide/unhide (existing behavior preserved for managers)
router.patch(
  "/hide/:id",
  verifyJWT,
  requireRole("superadmin", "manager"),
  toggleHideCar,
);
// Admin/Manager — Sold Vehicle Indicator toggle
router.patch(
  "/sold/:id",
  verifyJWT,
  requireRole("superadmin", "manager"),
  toggleSoldCar,
);
// Admin/Manager — update selected Vehicle Features
router.patch(
  "/features/:id",
  verifyJWT,
  requireRole("superadmin", "manager"),
  validateUpdateFeatures,
  updateCarFeatures,
);

// Admin/Manager — Image Editing: add, remove, reorder
router.patch(
  "/images/:id",
  verifyJWT,
  requireRole("superadmin", "manager"),
  uploadLimiter,
  uploadMultiple,
  handleUploadErrors,
  addCarImages,
);
router.put(
  "/images/:id",
  verifyJWT,
  requireRole("superadmin", "manager"),
  uploadLimiter,
  uploadMultiple,
  handleUploadErrors,
  replaceCarImages,
);
router.delete(
  "/images/:id",
  verifyJWT,
  requireRole("superadmin", "manager"),
  validateRemoveImage,
  removeCarImage,
);

// Admin/Manager — delete car
router.delete(
  "/:id",
  verifyJWT,
  requireRole("superadmin", "manager"),
  deleteCar,
);
router.patch(
  "/images/:id/reorder",
  verifyJWT,
  requireRole("superadmin", "manager"),
  reorderCarImages,
);

export default router;
