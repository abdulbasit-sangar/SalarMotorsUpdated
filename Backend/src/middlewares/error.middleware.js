import { ApiError } from "../utils/apiHelpers.js";

/**
 * Global error handling middleware.
 *
 * Must have exactly 4 parameters — Express identifies error middleware by arity.
 * Registered LAST in app.js, after all routes and other middleware.
 *
 * Handles:
 *  - ApiError           → our custom errors (statusCode + message + errors[])
 *  - Mongoose CastError → invalid ObjectId format
 *  - Mongoose ValidationError → schema-level field validation
 *  - Mongoose duplicate key (11000) → unique index violation
 *  - JWT errors         → safety net (should be caught in verifyJWT first)
 *  - Multer errors      → file upload failures not caught by handleUploadErrors
 *  - Generic Error      → unhandled runtime errors → 500
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // ── Mongoose CastError (invalid ObjectId) ─────────────────────────────────
  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid value for field: ${err.path}`);
  }

  // ── Mongoose ValidationError ──────────────────────────────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(422, "Validation failed", messages);
  }

  // ── Mongoose duplicate key (unique index violation) ───────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new ApiError(409, `${field} '${value}' already exists`);
  }

  // ── JWT errors (safety net) ────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid access token");
  }
  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Access token has expired");
  }

  // ── MongoDB / network-level connectivity errors ───────────────────────────
  // Previously these fell through to "Generic Error → 500" below, which sent
  // the raw Node/driver message (e.g. literally "read ECONNRESET") straight
  // to the frontend — cryptic, and not actionable. These are exactly the
  // errors that fire when Atlas connectivity drops mid-request (see
  // config/db.js's "disconnected"/"reconnected" logging). They're expected
  // to happen occasionally given real-world network conditions, so they get
  // a clear, honest 503 instead of looking like an application crash.
  // NOTE: if this error happened after a Car document was already
  // successfully created, car.controller.js never lets it reach here in the
  // first place — see the completeListingCreation try/catch there — so
  // reaching this branch means the operation genuinely did not persist
  // anything, and it's safe to tell the admin their data wasn't saved.
  const isMongoNetworkError =
    err.name === "MongoNetworkError" ||
    err.name === "MongoServerSelectionError" ||
    err.name === "MongoTimeoutError" ||
    err.name === "MongoNotConnectedError" ||
    ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(err.code);
  if (isMongoNetworkError) {
    error = new ApiError(
      503,
      "We lost the connection to the database while saving your changes. " +
        "Nothing was saved for this attempt — please check Manage Listings, " +
        "and try again if your listing isn't there.",
    );
  }

  // ── Final response ────────────────────────────────────────────────────────
  const statusCode = error.statusCode || 500;
  const message    = error.message    || "Internal Server Error";
  const errors     = error.errors     || [];

  // Never expose stack traces in production
  const stack = process.env.NODE_ENV === "development" ? error.stack : undefined;

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(stack && { stack }),
  });
};

export default errorHandler;
