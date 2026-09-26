import mongoose from "mongoose";

// ─── Favorite schema ───────────────────────────────────────────────────────────
// FAVORITES / WISHLIST SYSTEM
//
// The project has no public customer accounts (only Admin/Manager auth
// exists — see admin.model.js), so favorites are scoped to an anonymous
// per-device identifier instead of a logged-in user:
//
//   - The frontend generates a random UUID once per browser and persists it
//     in localStorage (see shared/utils/deviceId.js), sending it on every
//     request as the `X-Device-Id` header.
//   - This collection is the persistent, server-side source of truth — the
//     device ID is only a lookup key, never trusted for anything beyond
//     "which favorites belong together". A favorite is added/removed/read
//     only through the /api/favorites endpoints (see favorite.routes.js),
//     which is what makes this a real backend feature rather than
//     local-only frontend state.
const favoriteSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      trim: true,
      index: true,
    },

    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: [true, "Car is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// A device can only favorite the same car once — also lets addFavorite be
// safely idempotent (see favorite.service.js).
favoriteSchema.index({ deviceId: 1, car: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);

export default Favorite;
