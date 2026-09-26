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

export const csrfProtection = (req, res, next) => {
  if (req.method === "OPTIONS") return next();

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
