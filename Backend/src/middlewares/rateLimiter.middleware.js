import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/apiHelpers.js";
import { createRateLimitStore } from "./rateLimitStore.js";

// SECURITY FIXES:
// - Every sensitive endpoint gets its OWN limiter instance. Previously
//   otpRequestLimiter was shared between forgot-password and manager
//   registration, so traffic on one consumed the other's bucket.
// - Keying: for unauthenticated auth endpoints, key by email (lowercased)
//   when present, otherwise by IP. This adds per-account protection on
//   top of per-IP protection and survives IP rotation.
// - New limiters for refresh, reset-password, admin registration and
//   favorites, which previously had only the global limiter.
//
// SHARED STORAGE: each limiter below gets its own store instance with a
// distinct Redis key prefix (see rateLimitStore.js). With REDIS_URL set,
// counters are shared across backend instances and survive restarts;
// without it, the default in-memory store is used (previous behavior).

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

const FAIL_CLOSED = process.env.RATE_LIMIT_FAIL_CLOSED === "true";

const createLimiter = (windowMs, max, message, keyGenerator, storeName) => {
  const store = createRateLimitStore(storeName);
  const limiter = rateLimit({
    windowMs,
    max,
    keyGenerator,
    store,
    // Fail-open path: if the store throws, express-rate-limit logs and
    // allows the request instead of 500ing. (Fail-closed is handled
    // inside GuardedRedisStore by reporting the bucket as exceeded.)
    passOnStoreError: !FAIL_CLOSED,
    skip: (req) => req.method === "OPTIONS",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new ApiError(429, message));
    },
  });
  // Exposed for observability/tests: which store (and key prefix) backs
  // this limiter. Harmless — Express ignores extra function properties.
  limiter.store = store;
  return limiter;
};

export const globalLimiter = createLimiter(
  15 * 60 * 1000,
  process.env.NODE_ENV === "development" ? 500 : 100,
  "Too many requests from this IP. Please try again after 15 minutes.",
  undefined,
  "global",
);

export const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again after 15 minutes.",
  emailOrIpKey,
  "login",
);

export const uploadLimitKey = (req) =>
  // SECURITY HARDENING (2026-11-03 audit): key uploads by the authenticated
  // user, not just the IP. IP-only keying lets one account behind NAT burn the
  // bucket for everyone on that IP, and gives each attacker IP a 30/hr budget.
  // Every upload route runs verifyJWT before this limiter, so req.admin is set
  // for all legitimate traffic; the IP fallback is belt-and-braces.
  req.admin?._id ? `user:${req.admin._id}` : `ip:${req.ip}`;

export const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  30,
  "Upload limit reached. Maximum 30 car listings per hour.",
  uploadLimitKey,
  "upload",
);

export const searchLimiter = createLimiter(
  60 * 1000,
  60,
  "Too many search requests. Please slow down.",
  undefined,
  "search",
);

// Separate instances — do not reuse these across endpoints.
export const otpRequestLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many password reset requests. Please try again later.",
  ipAndEmailKey,
  "otp-request",
);

export const managerRegisterLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many manager registration requests. Please try again later.",
  ipAndEmailKey,
  "manager-register",
);

export const otpResendLimiter = createLimiter(
  60 * 1000,
  1,
  "Please wait before requesting another code.",
  ipAndEmailKey,
  "otp-resend",
);

export const otpVerifyLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many verification attempts. Please try again later.",
  ipAndEmailKey,
  "otp-verify",
);

export const refreshLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  "Too many refresh attempts. Please try again later.",
  undefined,
  "refresh",
);

export const resetPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many password reset attempts. Please try again later.",
  ipAndEmailKey,
  "reset-password",
);

export const adminRegisterLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many admin registration attempts. Please try again later.",
  undefined,
  "admin-register",
);

export const favoritesLimiter = createLimiter(
  60 * 1000,
  60,
  "Too many favorites requests. Please slow down.",
  undefined,
  "favorites",
);
