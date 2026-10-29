import { ApiError } from "../utils/apiHelpers.js";

// SECURITY FIX: Duplicate-key errors no longer echo the existing value.
// Previously `email 'x@example.com' already exists` confirmed account
// existence. Account fields now get a generic message; other fields get
// the field name only, without the value.
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid value for field: ${err.path}`);
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(422, "Validation failed", messages);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    if (field === "email" || field === "username") {
      error = new ApiError(
        409,
        "An account with this information already exists",
      );
    } else {
      error = new ApiError(409, `${field} already exists`);
    }
  }

  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid access token");
  }
  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Access token has expired");
  }

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

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  const errors = error.errors || [];
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
