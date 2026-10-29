import crypto from "crypto";
import { ApiError } from "../utils/apiHelpers.js";

const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";
const CSRF_MAX_AGE = 2 * 60 * 60 * 1000;

const csrfCookieOptions = {
  httpOnly: false, // Frontend JS must read it to send the header; keep SameSite + CORS as the real boundary.
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: CSRF_MAX_AGE,
  path: "/",
};

const issueCsrfCookie = (res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions);
  return token;
};

const ANONYMOUS_FAVORITES_MUTATION = /^\/api\/favorites\/[^/]+\/?$/;

const isAnonymousFavoritesMutation = (req) =>
  (req.method === "POST" || req.method === "DELETE") &&
  ANONYMOUS_FAVORITES_MUTATION.test(req.path);

// SECURITY FIX: Compare SHA-256 hashes of both tokens, not the raw
// strings. This makes buffers always equal length, so timingSafeEqual
// cannot throw on multibyte or mismatched-length input, and it does
// not leak length via a pre-check.
const csrfTokensMatch = (headerToken, cookieToken) => {
  if (typeof headerToken !== "string" || typeof cookieToken !== "string") {
    return false;
  }
  const a = crypto.createHash("sha256").update(headerToken).digest();
  const b = crypto.createHash("sha256").update(cookieToken).digest();
  return crypto.timingSafeEqual(a, b);
};

export const csrfProtection = (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  if (isAnonymousFavoritesMutation(req)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE] || issueCsrfCookie(res);
  const unsafeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (!unsafeMethod) return next();

  const headerToken = req.headers[CSRF_HEADER];
  if (!csrfTokensMatch(headerToken, cookieToken)) {
    return next(new ApiError(403, "Invalid CSRF token"));
  }

  next();
};

export const getCsrfCookieName = () => CSRF_COOKIE;
