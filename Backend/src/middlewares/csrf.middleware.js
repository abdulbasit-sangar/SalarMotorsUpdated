import crypto from "crypto";
import { ApiError } from "../utils/apiHelpers.js";

const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";
const CSRF_MAX_AGE = 2 * 60 * 60 * 1000;

const csrfCookieOptions = {
  httpOnly: false,
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

// Anonymous favorites mutations (POST/DELETE /api/favorites/:carId) are the ONLY
// state-changing requests exempt from CSRF validation. They are not backed by
// any cookie/session credential (so there is nothing for CSRF to ride on); they
// are scoped by the X-Device-Id header, enforced by requireDeviceId in
// favorite.routes.js. The custom header also forces a CORS preflight, and CORS
// only allows FRONTEND_URL. csrfProtection is mounted at app level, so req.path
// is the full path. Matching is exact and case-sensitive: any variation falls
// through to normal CSRF validation (fails closed).
const ANONYMOUS_FAVORITES_MUTATION = /^\/api\/favorites\/[^/]+\/?$/;

const isAnonymousFavoritesMutation = (req) =>
  (req.method === "POST" || req.method === "DELETE") &&
  ANONYMOUS_FAVORITES_MUTATION.test(req.path);

export const csrfProtection = (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  if (isAnonymousFavoritesMutation(req)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE] || issueCsrfCookie(res);
  const unsafeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (!unsafeMethod) return next();

  const headerToken = req.headers[CSRF_HEADER];
  if (
    typeof headerToken !== "string" ||
    headerToken.length !== cookieToken.length ||
    !crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))
  ) {
    return next(new ApiError(403, "Invalid CSRF token"));
  }

  next();
};

export const getCsrfCookieName = () => CSRF_COOKIE;
