import jwt from "jsonwebtoken";

// Parse durations like "15m", "7d", "1h", "30s" to milliseconds.
// Used so the refresh cookie lifetime always matches REFRESH_TOKEN_EXPIRY.
export const parseDurationMs = (value, fallbackMs) => {
  if (!value || typeof value !== "string") return fallbackMs;
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return amount * unit;
};

const DEFAULT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Access token — 15 minutes by default, HS256 pinned.
 * Payload must contain { _id, email, role, tokenVersion }.
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });
};

/**
 * Refresh token — 7 days by default, HS256 pinned.
 * SECURITY NOTE: Never store this value in plaintext. auth.service.js
 * now stores only its SHA-256 hash (see hashSecret in otpUtils.js).
 * A 256-bit random token hashed with SHA-256 is safe at rest; a
 * low-entropy secret would not be.
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  });
};

export const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
};

/**
 * Cookie options for the HttpOnly refresh token cookie.
 * SECURITY FIX: maxAge is derived from REFRESH_TOKEN_EXPIRY, not fixed
 * at 7 days. Secure/SameSite still depend on NODE_ENV=production, which
 * server.js now requires to be set explicitly.
 */
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: parseDurationMs(process.env.REFRESH_TOKEN_EXPIRY, DEFAULT_REFRESH_MS),
  // Path is kept as "/" deliberately: the logout controller clears this
  // cookie, and a narrower path here could leave the old cookie behind
  // if clearCookie is called without the same path.
  path: "/",
};

/**
 * SESSION ISOLATION: each role gets its own refresh-token cookie name.
 * Previously both roles shared the single "refreshToken" cookie, so
 * logging in as a manager overwrote the superadmin's cookie (and vice
 * versa) — the two sessions could never coexist in one browser.
 */
export const REFRESH_COOKIE_NAMES = {
  superadmin: "adminRefreshToken",
  manager: "managerRefreshToken",
};

export const refreshCookieNameForRole = (role) =>
  role === "manager"
    ? REFRESH_COOKIE_NAMES.manager
    : REFRESH_COOKIE_NAMES.superadmin;
