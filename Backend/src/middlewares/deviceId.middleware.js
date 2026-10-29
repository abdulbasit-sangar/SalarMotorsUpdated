import { ApiError } from "../utils/apiHelpers.js";

// SECURITY FIX: Favorites are bearer-token by device ID, so the ID must
// be unguessable. Previously any 8-100 character alphanumeric string
// was accepted, which made short or predictable IDs trivial to guess.
// Now only a UUIDv4 is accepted. The frontend already generates a UUID
// (see Frontend shared/utils/deviceId.js); older non-UUID device IDs
// will need to be regenerated once — their favorites are not migrated.
const DEVICE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
