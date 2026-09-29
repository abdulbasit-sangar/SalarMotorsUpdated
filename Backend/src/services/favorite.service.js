import Favorite from "../models/favorite.model.js";
import Car from "../models/car.model.js";
import { ApiError } from "../utils/apiHelpers.js";
import { validateObjectId } from "./car.service.js";

// Same select projection used by the public car list endpoints (car.service.js)
// plus isSold, so favorited cards render identically to every other card —
// including the Sold ribbon (see CarCard.jsx).
const CARD_FIELDS =
  "title brand model year price province city images featured isSold slug createdAt isHidden";

// ─── Add favorite ──────────────────────────────────────────────────────────────
export const addFavoriteService = async (deviceId, carId) => {
  validateObjectId(carId, "car ID");

  const car = await Car.findById(carId).select("_id isHidden");
  if (!car) throw new ApiError(404, "Car not found");

  // Idempotent: favoriting an already-favorited car just returns success
  // instead of throwing a duplicate-key error — a double-click or a retried
  // request should never surface as an error to the user.
  await Favorite.updateOne(
    { deviceId, car: carId },
    { $setOnInsert: { deviceId, car: carId } },
    { upsert: true },
  );

  return { carId };
};

// ─── Remove favorite ───────────────────────────────────────────────────────────
export const removeFavoriteService = async (deviceId, carId) => {
  validateObjectId(carId, "car ID");
  await Favorite.deleteOne({ deviceId, car: carId });
  return { carId };
};

// ─── Get current device's favorites (full car cards) ───────────────────────────
export const getFavoritesService = async (deviceId) => {
  const favorites = await Favorite.find({ deviceId })
    .sort({ createdAt: -1 })
    .populate({ path: "car", select: CARD_FIELDS })
    .lean();

  // A favorited car may since have been deleted, or hidden by an admin —
  // filter those out rather than surfacing broken cards on the Favorites
  // page. (Sold cars are kept — the spec requires sold vehicles to remain
  // correctly marked inside Favorites, not disappear.)
  const cars = favorites
    .map((f) => f.car)
    .filter((car) => car && !car.isHidden);

  return {
    cars,
    favoritedCarIds: favorites
      .filter((f) => f.car)
      .map((f) => String(f.car._id)),
  };
};
