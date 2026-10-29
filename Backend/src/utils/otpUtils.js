import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_MAX = 10 ** OTP_LENGTH;

/**
 * Cryptographically secure 6-digit OTP, zero-padded.
 */
export const generateOtp = () => {
  const value = crypto.randomInt(0, OTP_MAX);
  return String(value).padStart(OTP_LENGTH, "0");
};

/**
 * SECURITY FIX: Hash short secrets with HMAC-SHA256 when OTP_HASH_SECRET
 * is configured (required in production by server.js), instead of
 * unsalted SHA-256. A 6-digit OTP hashed with unsalted SHA-256 is
 * trivially brute-forceable if the database leaks.
 * Fallback to plain SHA-256 only in development, so existing dev flows
 * do not break if the secret is not yet set. Do not use the fallback
 * in production.
 */
export const hashSecret = (value) => {
  const secret = process.env.OTP_HASH_SECRET;
  if (secret) {
    return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
  }
  return crypto.createHash("sha256").update(String(value)).digest("hex");
};

export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Constant-time comparison, safe for multibyte input.
 * Both values are hashed first, so buffers are always equal length
 * and timingSafeEqual cannot throw on length mismatch.
 */
export const safeCompareHashes = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = crypto.createHash("sha256").update(a).digest();
  const bufB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
};
