import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/apiHelpers.js";

/**
 * Generic rate limiter factory.
 * Returns a configured express-rate-limit middleware instance.
 *
 * @param {number} windowMs   - Time window in milliseconds
 * @param {number} max        - Max requests per window per IP
 * @param {string} message    - Error message when limit is exceeded
 */
const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    skip: (req) => req.method === "OPTIONS",
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers (deprecated)
    handler: (req, res, next) => {
      next(new ApiError(429, message));
    },
  });

// ── Global limiter — applied to ALL routes ────────────────────────────────────
// 100 requests per 15 minutes per IP. Stops general abuse and DDoS attempts.
export const globalLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === "development" ? 500 : 100,
  "Too many requests from this IP. Please try again after 15 minutes.",
);

// ── Auth limiter — applied to login only ──────────────────────────────────────
// 10 attempts per 15 minutes per IP. Prevents brute-force attacks on login.
export const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many login attempts from this IP. Please try again after 15 minutes.",
);

// ── Upload limiter — applied to POST /api/cars ────────────────────────────────
// 30 uploads per hour per IP. Protects the ImageKit upload quota.
export const uploadLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  30,
  "Upload limit reached. Maximum 30 car listings per hour.",
);

// ── Search limiter — applied to search/filter endpoints ───────────────────────
// 60 searches per minute per IP. Prevents regex abuse on search.
export const searchLimiter = createLimiter(
  60 * 1000, // 1 minute
  60,
  "Too many search requests. Please slow down.",
);

// ── OTP request limiter — applied to forgot-password ──────────────────────────
// 5 requests per 15 minutes per IP. Prevents OTP-email spam/abuse.
export const otpRequestLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many password reset requests. Please try again later.",
);

// ── OTP resend limiter — applied to resend-otp ─────────────────────────────────
// 1 request per 60 seconds per IP — matches the required resend cooldown.
export const otpResendLimiter = createLimiter(
  60 * 1000, // 60 seconds
  1,
  "Please wait before requesting another code.",
);

// ── OTP verify limiter — applied to verify-reset-otp ───────────────────────────
// 10 attempts per 15 minutes per IP. Slows down OTP brute-forcing at the network level
// (the per-OTP attempt counter in the DB is the primary defense).
export const otpVerifyLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many verification attempts. Please try again later.",
);
