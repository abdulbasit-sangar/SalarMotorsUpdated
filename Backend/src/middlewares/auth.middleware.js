import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import { ApiError } from "../utils/apiHelpers.js";
import { asyncHandler } from "../utils/apiHelpers.js";

/**
 * verifyJWT — protects admin-only routes.
 *
 * Reads the Bearer token from the Authorization header.
 * Verifies it against ACCESS_TOKEN_SECRET.
 * Attaches the admin document to req.admin for downstream controllers.
 *
 * Usage:
 *   router.post("/logout", verifyJWT, logoutAdmin);
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    throw new ApiError(401, "Access token is missing");
  }

  // 2. Verify token signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token has expired — please refresh");
    }
    throw new ApiError(401, "Invalid access token");
  }

  // 3. Confirm the admin still exists and is active
  const admin = await Admin.findById(decoded._id);
  if (!admin) {
    throw new ApiError(401, "Admin account not found");
  }
  if (!admin.isActive) {
    throw new ApiError(403, "Admin account has been deactivated");
  }

  // 4. Attach to request — controllers can now use req.admin
  req.admin = admin.toPublicJSON();
  next();
});

/**
 * requireRole — Manager/Sub-Admin RBAC authorization gate.
 *
 * MUST be used after verifyJWT (relies on req.admin being set). Rejects
 * with 403 Forbidden if the authenticated admin's role is not one of the
 * allowed roles — enforced entirely server-side, so a manager can never
 * bypass this by calling the API directly (Postman, dev tools, etc.),
 * regardless of what the frontend shows or hides.
 *
 * Usage:
 *   router.delete("/:id", verifyJWT, requireRole("superadmin"), deleteCar);
 *   router.post("/", verifyJWT, requireRole("superadmin", "manager"), createCar);
 */
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.admin) {
    throw new ApiError(401, "Authentication required");
  }
  if (!allowedRoles.includes(req.admin.role)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  next();
};
