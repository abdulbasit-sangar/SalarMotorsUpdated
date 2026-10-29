import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favorite.controller.js";
import { requireDeviceId } from "../middlewares/deviceId.middleware.js";
import { favoritesLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// SECURITY FIX: Favorites now have their own limiter, and device IDs
// must be UUIDv4 (see deviceId.middleware.js). Favorites remain
// anonymous by design — they are not authenticated and must not be
// treated as private account data.
router.use(requireDeviceId, favoritesLimiter);

router.get("/", getFavorites);
router.post("/:carId", addFavorite);
router.delete("/:carId", removeFavorite);

export default router;
