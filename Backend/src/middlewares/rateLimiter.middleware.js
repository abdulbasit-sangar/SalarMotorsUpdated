import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/apiHelpers.js";

// SECURITY FIXES:
// - Every sensitive endpoint gets its OWN limiter instance. Previously
//   otpRequestLimiter was shared between forgot-password and manager
//   registration, so traffic on one consumed the other's bucket.
// - Keying: for unauthenticated auth endpoints, key by email (lowercased)
//   when present, otherwise by IP. This adds per-account protection on
//   top of per-IP protection and survives IP rotation.
// - New limiters for refresh, reset-password, admin registration and
//   favorites, which previously had only the global limiter.

const emailOrIpKey = (req) => {
  const email = req.body?.email;
  if (typeof email === "string" && email.trim()) {
    return `email:${email.trim().toLowerCase()}`;
  }
  return req.ip;
};

const ipAndEmailKey = (req) => {
  const email = req.body?.email;
  if (typeof email === "string" && email.trim()) {
    return `${req.ip}:${email.trim().toLowerCase()}`;
  }
  return req.ip;
};

const createLimiter = (windowMs, max, message, keyGenerator) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator,
    skip: (req) => req.method === "OPTIONS",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new ApiError(429, message));
    },
  });

export const globalLimiter = createLimiter(
  15 * 60 * 1000,
  process.env.NODE_ENV === "development" ? 500 : 100,
  "Too many requests from this IP. Please try again after 15 minutes.",
);

export const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again after 15 minutes.",
  emailOrIpKey,
);

export const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  30,
  "Upload limit reached. Maximum 30 car listings per hour.",
);

export const searchLimiter = createLimiter(
  60 * 1000,
  60,
  "Too many search requests. Please slow down.",
);

// Separate instances — do not reuse these across endpoints.
export const otpRequestLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many password reset requests. Please try again later.",
  ipAndEmailKey,
);

export const managerRegisterLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many manager registration requests. Please try again later.",
  ipAndEmailKey,
);

export const otpResendLimiter = createLimiter(
  60 * 1000,
  1,
  "Please wait before requesting another code.",
  ipAndEmailKey,
);

export const otpVerifyLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many verification attempts. Please try again later.",
  ipAndEmailKey,
);

export const refreshLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  "Too many refresh attempts. Please try again later.",
);

export const resetPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many password reset attempts. Please try again later.",
  ipAndEmailKey,
);

export const adminRegisterLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many admin registration attempts. Please try again later.",
);

export const favoritesLimiter = createLimiter(
  60 * 1000,
  60,
  "Too many favorites requests. Please slow down.",
);
