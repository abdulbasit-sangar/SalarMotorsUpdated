import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import { ApiError } from "../utils/apiHelpers.js";
import { asyncHandler } from "../utils/apiHelpers.js";

/**
 * verifyJWT — protects admin-only routes.
 * SECURITY FIXES:
 * - Pins algorithms to HS256 (no alg confusion).
 * - Re-checks isActive AND emailVerified on every request.
 * - Re-checks tokenVersion: password change, reset, logout and
 *   deactivation increment tokenVersion, which instantly revokes
 *   previously issued access tokens (previously they lived up to 15m).
 * - Role is still taken from the DB document, never from client input.
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (!token) {
    throw new ApiError(401, "Access token is missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token has expired — please refresh");
    }
    throw new ApiError(401, "Invalid access token");
  }

  const admin = await Admin.findById(decoded._id);
  if (!admin) {
    throw new ApiError(401, "Admin account not found");
  }
  if (!admin.isActive) {
    throw new ApiError(403, "Admin account has been deactivated");
  }
  if (!admin.emailVerified) {
    throw new ApiError(403, "Admin email has not been verified");
  }
  // tokenVersion defaults to 0 (see the Admin model) for accounts created
  // before this fix.
  const tokenVersion = admin.tokenVersion ?? 0;
  if (decoded.tokenVersion === undefined) {
    // LEGACY-TOKEN POLICY: tokens issued before tokenVersion existed
    // carry no version claim. They are honored only while the account
    // has never experienced a revocation event (tokenVersion still 0):
    // the first logout, password change/reset, deactivation, or
    // reuse-revocation bumps the version and permanently invalidates
    // every legacy token. All tokens issued since the fix carry the
    // claim, so a legacy token can only be an old one nearing its
    // natural expiry (15m access / 7d refresh) — and any revocation
    // since its issuance now kills it instead of being bypassed.
    // Missing the claim is never treated as "no check needed".
    if (tokenVersion !== 0) {
      throw new ApiError(401, "Access token has been revoked");
    }
  } else if (decoded.tokenVersion !== tokenVersion) {
    throw new ApiError(401, "Access token has been revoked");
  }

  req.admin = admin.toPublicJSON();
  next();
});

/**
 * requireRole — MUST be used after verifyJWT.
 */
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.admin) {
    throw new ApiError(401, "Authentication required");
  }
  if (!allowedRoles.includes(req.admin.role)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  next();
}
