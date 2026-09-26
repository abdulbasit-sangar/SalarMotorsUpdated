import { asyncHandler, ApiResponse } from "../utils/apiHelpers.js";
import {
  addFavoriteService,
  removeFavoriteService,
  getFavoritesService,
} from "../services/favorite.service.js";

// GET /api/favorites — this device's saved cars
export const getFavorites = asyncHandler(async (req, res) => {
  const result = await getFavoritesService(req.deviceId);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Favorites fetched successfully"));
});

// POST /api/favorites/:carId
export const addFavorite = asyncHandler(async (req, res) => {
  const result = await addFavoriteService(req.deviceId, req.params.carId);
  return res
    .status(201)
    .json(new ApiResponse(201, result, "Added to favorites"));
});

// DELETE /api/favorites/:carId
export const removeFavorite = asyncHandler(async (req, res) => {
  const result = await removeFavoriteService(req.deviceId, req.params.carId);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Removed from favorites"));
});
