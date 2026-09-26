import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favorite.controller.js";
import { requireDeviceId } from "../middlewares/deviceId.middleware.js";

const router = Router();

// All favorites routes require the anonymous X-Device-Id header — see
// deviceId.middleware.js and favorite.model.js for the full rationale
// (no public user accounts exist in this project).
router.use(requireDeviceId);

router.get("/", getFavorites);
router.post("/:carId", addFavorite);
router.delete("/:carId", removeFavorite);

export default router;
