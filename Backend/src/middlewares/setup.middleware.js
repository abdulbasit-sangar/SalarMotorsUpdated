import crypto from "crypto";
import { ApiError } from "../utils/apiHelpers.js";

// SECURITY FIX: Timing-safe comparison via hashed tokens, and a
// minimum-length check. server.js also rejects a setup token shorter
// than 32 characters at startup.
const tokensMatch = (supplied, configured) => {
  if (typeof supplied !== "string" || typeof configured !== "string") {
    return false;
  }
  const a = crypto.createHash("sha256").update(supplied).digest();
  const b = crypto.createHash("sha256").update(configured).digest();
  return crypto.timingSafeEqual(a, b);
};

export const requireSetupToken = (req, res, next) => {
  const configuredToken = process.env.ADMIN_SETUP_TOKEN;
  const suppliedToken = req.headers["x-admin-setup-token"];

  if (!configuredToken) {
    return next(
      new ApiError(
        503,
        "Admin setup is disabled until ADMIN_SETUP_TOKEN is configured",
      ),
    );
  }

  if (configuredToken.length < 32) {
    return next(new ApiError(503, "Admin setup token is misconfigured"));
  }

  if (!tokensMatch(suppliedToken, configuredToken)) {
    return next(new ApiError(403, "Invalid admin setup token"));
  }

  next();
};
