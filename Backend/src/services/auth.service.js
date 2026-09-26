// Added registerAdminService: creates the first admin (one-time).
// Other auth services (login, logout, refresh) remain unchanged.
//
// Also added: change-password + forgot-password/OTP/reset-password services
// for the new Admin Password Management feature. These reuse the existing
// Admin model, bcrypt hashing (via the model's pre-save hook), and ApiError
// conventions — no new auth framework introduced.
import Admin from "../models/admin.model.js";
import PasswordResetOtp from "../models/passwordResetOtp.model.js";
import { ApiError } from "../utils/apiHelpers.js";
import { generateTokenPair } from "../utils/tokenUtils.js";
import {
  generateOtp,
  hashSecret,
  generateResetToken,
  safeCompareHashes,
} from "../utils/otpUtils.js";
import { sendPasswordResetOtpEmail } from "./email.service.js";

const OTP_TTL_MS = 60 * 1000; // 1 minute
const MAX_OTP_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete the reset step

/**
 * Authenticates an admin by email and password.
 * Returns the admin document and a fresh token pair.
 * Throws ApiError on any failure — never leaks which field was wrong.
 */
export const loginAdminService = async ({ email, password }) => {
  // 1. Find admin by email — explicitly select password + refreshToken
  //    (both have `select: false` in the schema)
  const admin = await Admin.findOne({ email }).select(
    "+password +refreshToken",
  );

  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!admin.isActive) {
    throw new ApiError(403, "This admin account has been deactivated");
  }

  // Manager/Sub-Admin RBAC: a manager account isn't usable until its email
  // has been verified via OTP (see registerManagerService). Existing
  // accounts and the superadmin default to emailVerified: true, so this
  // never affects the pre-existing login flow.
  if (!admin.emailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  // 2. Compare submitted password against stored bcrypt hash
  const isPasswordValid = await admin.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // 3. Generate token pair — payload is minimal (no sensitive data in JWT)
  const tokenPayload = {
    _id: admin._id,
    email: admin.email,
    role: admin.role,
  };
  const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

  // 4. Persist the new refresh token (overwrites old — single active session per admin)
  admin.refreshToken = refreshToken;
  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  return {
    admin: admin.toPublicJSON(),
    accessToken,
    refreshToken,
  };
};

/**
 * Logs out an admin by clearing their refresh token from DB.
 * The cookie is cleared by the controller.
 */
export const logoutAdminService = async (adminId) => {
  await Admin.findByIdAndUpdate(
    adminId,
    { $unset: { refreshToken: 1 } },
    { new: true },
  );
};

/**
 * Issues a new access token using a valid refresh token.
 * Called by the /refresh endpoint.
 */
export const refreshAccessTokenService = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  let decoded;
  try {
    const jwt = await import("jsonwebtoken");
    decoded = jwt.default.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const admin = await Admin.findById(decoded._id).select("+refreshToken");
  if (!admin || admin.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token has been revoked");
  }

  const tokenPayload = { _id: admin._id, email: admin.email, role: admin.role };
  const { accessToken, refreshToken: newRefreshToken } =
    generateTokenPair(tokenPayload);

  // Rotate the refresh token
  admin.refreshToken = newRefreshToken;
  await admin.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Registers the initial admin account. This is strictly one-time —
 * if any admin exists, registration is rejected.
 */
export const registerAdminService = async ({ username, email, password }) => {
  const existing = await Admin.countDocuments();
  if (existing > 0) {
    throw new ApiError(403, "Admin already exists. Registration is disabled.");
  }

  const admin = await Admin.create({ username, email, password });

  const tokenPayload = { _id: admin._id, email: admin.email, role: admin.role };
  const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

  // Persist refresh token and lastLogin
  admin.refreshToken = refreshToken;
  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  return { admin: admin.toPublicJSON(), accessToken, refreshToken };
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 1 — Normal change password (admin knows current password)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Changes the password for an already-authenticated admin.
 * Requires the correct current password. Invalidates the existing
 * refresh token on success so other/older sessions are forced to log in
 * again with the new password (reuses the existing single-refreshToken
 * session model — no new session architecture introduced).
 */
export const changePasswordService = async ({
  adminId,
  currentPassword,
  newPassword,
}) => {
  const admin = await Admin.findById(adminId).select("+password");
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const isCurrentValid = await admin.isPasswordCorrect(currentPassword);
  if (!isCurrentValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const isSameAsOld = await admin.isPasswordCorrect(newPassword);
  if (isSameAsOld) {
    throw new ApiError(400, "New password must be different from the current password");
  }

  admin.password = newPassword; // pre-save hook hashes it
  admin.refreshToken = undefined; // invalidate existing session(s)
  await admin.save();

  return { success: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 2 — Forgot password via email OTP
// ─────────────────────────────────────────────────────────────────────────────

const genericForgotPasswordResponse = {
  message: "If an account exists for this email, a verification code has been sent.",
};

/**
 * Starts the forgot-password flow: generates a fresh OTP, invalidates any
 * previous OTP for this admin, emails the new OTP, and returns a generic
 * response regardless of whether the email matched an account
 * (account-enumeration protection).
 */
export const forgotPasswordService = async ({ email }) => {
  const admin = await Admin.findOne({ email });

  if (admin) {
    const otp = generateOtp();
    const otpHash = hashSecret(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // A new OTP request invalidates any previous, still-pending OTP for
    // this admin — enforced by simply removing prior unused records.
    await PasswordResetOtp.deleteMany({ adminId: admin._id, used: false });

    await PasswordResetOtp.create({
      adminId: admin._id,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
    });

    // Best-effort send — if email fails we still return the generic
    // response so we don't leak account existence via error behavior.
    try {
      await sendPasswordResetOtpEmail({ to: admin.email, otp });
    } catch (err) {
      console.error(`Failed to send password reset OTP email: ${err.message}`);
    }
  }

  return genericForgotPasswordResponse;
};

/**
 * Resends a fresh OTP for an existing forgot-password request.
 * Uses the same generic response and invalidation behavior as the
 * initial request. Cooldown/rate-limiting is enforced at the route level.
 */
export const resendOtpService = async ({ email }) => {
  return forgotPasswordService({ email });
};

/**
 * Verifies a submitted OTP. On success, invalidates the OTP and issues a
 * short-lived, single-purpose reset-authorization token that ONLY permits
 * the reset-password step below — it is not a normal admin JWT and grants
 * no dashboard/API access.
 */
export const verifyResetOtpService = async ({ email, otp }) => {
  const invalidOtpError = () => new ApiError(400, "Invalid or expired verification code");

  const admin = await Admin.findOne({ email });
  if (!admin) {
    // Same generic failure as a wrong OTP — never reveal account existence.
    throw invalidOtpError();
  }

  const record = await PasswordResetOtp.findOne({
    adminId: admin._id,
    used: false,
  })
    .sort({ createdAt: -1 })
    .select("+otpHash");

  if (!record) {
    throw invalidOtpError();
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw invalidOtpError();
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new ApiError(400, "Too many attempts. Please request a new code.");
  }

  const submittedHash = hashSecret(String(otp));
  const isMatch = safeCompareHashes(submittedHash, record.otpHash);

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    throw invalidOtpError();
  }

  // OTP is correct — invalidate it immediately (single-use) and issue the
  // narrow-scope reset authorization token.
  const resetToken = generateResetToken();
  record.used = true;
  record.resetTokenHash = hashSecret(resetToken);
  record.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  record.resetTokenUsed = false;
  await record.save();

  return { resetToken };
};

/**
 * Completes the forgot-password flow: verifies the reset-authorization
 * token issued by verifyResetOtpService, then sets the new password.
 * Invalidates the reset token immediately after use (single-use) and
 * clears any existing admin session, same as the normal change-password flow.
 */
export const resetPasswordService = async ({ email, resetToken, newPassword }) => {
  const invalidTokenError = () =>
    new ApiError(400, "Invalid or expired password reset request");

  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw invalidTokenError();
  }

  const record = await PasswordResetOtp.findOne({
    adminId: admin._id,
    used: true,
    resetTokenUsed: false,
  })
    .sort({ createdAt: -1 })
    .select("+resetTokenHash");

  if (!record || !record.resetTokenHash) {
    throw invalidTokenError();
  }

  if (!record.resetTokenExpiresAt || record.resetTokenExpiresAt.getTime() < Date.now()) {
    throw invalidTokenError();
  }

  const submittedHash = hashSecret(resetToken);
  const isMatch = safeCompareHashes(submittedHash, record.resetTokenHash);
  if (!isMatch) {
    throw invalidTokenError();
  }

  const fullAdmin = await Admin.findById(admin._id).select("+password");
  fullAdmin.password = newPassword; // pre-save hook hashes it
  fullAdmin.refreshToken = undefined; // invalidate existing session(s)
  await fullAdmin.save();

  // Invalidate the reset token immediately — single use.
  record.resetTokenUsed = true;
  await record.save();

  return { success: true };
};
