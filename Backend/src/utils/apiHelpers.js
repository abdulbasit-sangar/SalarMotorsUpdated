// ─── ApiError ────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── ApiResponse ─────────────────────────────────────────────────────────────
export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

// ─── asyncHandler ─────────────────────────────────────────────────────────────
// Wraps every async controller — eliminates try/catch boilerplate.
// Any thrown ApiError or unhandled rejection is forwarded to Express error middleware.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
