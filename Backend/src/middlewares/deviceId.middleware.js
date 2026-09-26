import { ApiError } from "../utils/apiHelpers.js";

// ─── requireDeviceId ────────────────────────────────────────────────────────
// Favorites are scoped per-device (no public user accounts — see
// favorite.model.js for the full rationale). The frontend sends a
// self-generated UUID in the `X-Device-Id` header on every request (see
// shared/utils/deviceId.js + services/api/client.js); this middleware just
// validates it's present and reasonably well-formed before any favorites
// controller touches the database, and attaches it as req.deviceId.
const DEVICE_ID_RE = /^[a-zA-Z0-9-]{8,100}$/;

export const requireDeviceId = (req, res, next) => {
  const deviceId = req.headers["x-device-id"];

  if (!deviceId || typeof deviceId !== "string") {
    throw new ApiError(400, "Missing X-Device-Id header");
  }

  if (!DEVICE_ID_RE.test(deviceId)) {
    throw new ApiError(400, "Invalid X-Device-Id header");
  }

  req.deviceId = deviceId;
  next();
};
