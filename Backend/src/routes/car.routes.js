import { Router } from "express";
import {
  createCar,
  getAllCars,
  getAdminCars,
  getAdminCarById,
  updateCar,
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
import { validateImageBuffers } from "../middlewares/imageValidation.middleware.js";
import {
  validateCreateCar,
  validateMinImagesToPublish,
  validateUpdateFeatures,
  validateUpdateCar,
  validateRemoveImage,
  parseFeaturesField,
} from "../validators/car.validator.js";
import {
  uploadLimiter,
  searchLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Public — named routes (order matters, before /:id)
router.get("/featured", getFeaturedCars);
router.get("/options", getCarOptions);
router.get("/search", searchLimiter, searchCars);
router.get("/filter", searchLimiter, filterCars);
router.get("/", getAllCars);
router.get("/similar/:id", getSimilarCars);

router.get("/admin", verifyJWT, requireRole("superadmin", "manager"), getAdminCars);
router.get("/admin/:id", verifyJWT, requireRole("superadmin", "manager"), getAdminCarById);
router.get("/creation-status/:key", verifyJWT, requireRole("superadmin", "manager"), getCreationStatus);
router.get("/:id", getCarById);

// Create — SECURITY FIX: validateImageBuffers added after multer,
// so MIME spoofing is rejected before any ImageKit upload.
router.post(
  "/",
  verifyJWT,
  requireRole("superadmin", "manager"),
  uploadLimiter,
  uploadMultiple,
  handleUploadErrors,
  validateImageBuffers,
  parseFeaturesField,
  validateCreateCar,
  validateMinImagesToPublish,
  createCar,
);

router.patch("/feature/:id", verifyJWT, requireRole("superadmin"), toggleFeatureCar);
router.patch("/hide/:id", verifyJWT, requireRole("superadmin"), toggleHideCar);
router.patch("/sold/:id", verifyJWT, requireRole("superadmin", "manager"), toggleSoldCar);
router.patch("/features/:id", verifyJWT, requireRole("superadmin", "manager"), validateUpdateFeatures, updateCarFeatures);

router.patch(
  "/images/:id",
  verifyJWT,
  requireRole("superadmin"),
  uploadLimiter,
  uploadMultiple,
  handleUploadErrors,
  validateImageBuffers,
  addCarImages,
);
router.put(
  "/images/:id",
  verifyJWT,
  requireRole("superadmin"),
  uploadLimiter,
  uploadMultiple,
  handleUploadErrors,
  validateImageBuffers,
  replaceCarImages,
);
router.delete("/images/:id", verifyJWT, requireRole("superadmin"), validateRemoveImage, removeCarImage);
router.patch("/:id", verifyJWT, requireRole("superadmin", "manager"), validateUpdateCar, updateCar);

// DELETE was verified in the audit to already carry auth + role —
// it is kept exactly as in the original, not a new fix.
router.delete("/:id", verifyJWT, requireRole("superadmin"), deleteCar);
router.patch("/images/:id/reorder", verifyJWT, requireRole("superadmin"), reorderCarImages);

export default router;
