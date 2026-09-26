import jwt from "jsonwebtoken";

/**
 * Generates a short-lived access token (15 minutes).
 * Returned in the JSON response body — used in Authorization header.
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });
};

/**
 * Generates a long-lived refresh token (7 days).
 * Stored as an HttpOnly cookie — never exposed to JavaScript.
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  });
};

/**
 * Generates both tokens at once.
 * payload should contain { _id, email, role } — keep it minimal.
 */
export const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
};

/**
 * Cookie options for the HttpOnly refresh token cookie.
 * Cross-site production deployments require SameSite=None and HTTPS.
 */
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};
