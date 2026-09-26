// New utility: cryptographically secure OTP + reset-token generation/hashing.
// Used only by the password-reset flow.
import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_MAX = 10 ** OTP_LENGTH; // 1,000,000

/**
 * Generates a cryptographically secure 6-digit numeric OTP as a string,
 * zero-padded (e.g. "042913"). Uses crypto.randomInt — never Math.random.
 */
export const generateOtp = () => {
  const value = crypto.randomInt(0, OTP_MAX);
  return String(value).padStart(OTP_LENGTH, "0");
};

/**
 * Hashes an OTP (or any short secret) with SHA-256 for storage.
 * OTPs are short-lived and rate-limited, so a fast hash is appropriate here
 * (unlike passwords, which use bcrypt) — this mirrors common practice for
 * OTP/token storage.
 */
export const hashSecret = (value) => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

/**
 * Generates a cryptographically secure random token (for the short-lived
 * password-reset authorization) as a hex string.
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Constant-time comparison of two hex-encoded hash strings to avoid
 * timing attacks when checking OTPs/tokens.
 */
export const safeCompareHashes = (a, b) => {
  const bufA = Buffer.from(a || "", "hex");
  const bufB = Buffer.from(b || "", "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};
