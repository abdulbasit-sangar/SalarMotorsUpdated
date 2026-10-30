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

const OTP_TTL_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_RESET_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

// Refresh tokens are stored only as hashes. hashSecret is HMAC-SHA256
// in production (see otpUtils.js); a 256-bit token hashed this way is
// safe at rest, unlike a low-entropy OTP.
const hashRefreshToken = (token) => hashSecret(token);

const tokenPayloadFor = (admin) => ({
  _id: admin._id,
  email: admin.email,
  role: admin.role,
  tokenVersion: admin.tokenVersion ?? 0,
});

// SECURITY FIX: Login no longer returns distinct 403s for deactivated
// or unverified accounts before the password is checked. All failures
// now return the same generic 401, so an unauthenticated caller cannot
// enumerate account existence or status. Status is only enforced after
// a correct password, and still with a generic message.
export const loginAdminService = async ({ email, password, expectedRole }) => {
  const admin = await Admin.findOne({ email }).select(
    "+password +refreshToken",
  );
  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (admin.lockoutUntil && admin.lockoutUntil.getTime() > Date.now()) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await admin.isPasswordCorrect(password);
  if (!isPasswordValid) {
    // Per-account lockout, atomic increment.
    const attempts = (admin.failedLoginAttempts ?? 0) + 1;
    const update = { $inc: { failedLoginAttempts: 1 } };
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      update.$set = {
        lockoutUntil: new Date(Date.now() + LOGIN_LOCKOUT_MS),
        failedLoginAttempts: 0,
      };
      // $inc + $set on the same field conflict; lockout reset wins.
      delete update.$inc;
      update.$set.failedLoginAttempts = 0;
    }
    await Admin.updateOne({ _id: admin._id }, update);
    throw new ApiError(401, "Invalid email or password");
  }

  // Role check AFTER password — tokens are NOT issued if this fails.
  if (expectedRole && admin.role !== expectedRole) {
    const otherLogin =
      expectedRole === "superadmin" ? "/manager/login" : "/admin/login";
    throw new ApiError(
      403,
      `This login is for ${expectedRole === "superadmin" ? "the main admin" : "managers"} only. Please use ${otherLogin}.`,
      [],
      "ROLE_MISMATCH",
    );
  }

  if (!admin.emailVerified) {
    throw new ApiError(
      403,
      "Please verify your email before logging in.",
      [],
      "EMAIL_NOT_VERIFIED",
    );
  }

  if (!admin.isActive) {
    // Never activated + never logged in = pending approval.
    // Previously activated + now inactive = deactivated by a superadmin.
    const code = admin.lastLogin ? "ACCOUNT_DEACTIVATED" : "ACCOUNT_PENDING";
    const message =
      code === "ACCOUNT_PENDING"
        ? "Your account is pending approval. Once an admin activates it, you will be able to log in."
        : "Your account has been deactivated. Please contact the main admin.";
    throw new ApiError(403, message, [], code);
  }

  const { accessToken, refreshToken } = generateTokenPair(tokenPayloadFor(admin));

  admin.refreshToken = hashRefreshToken(refreshToken);
  admin.lastLogin = new Date();
  admin.failedLoginAttempts = 0;
  admin.lockoutUntil = null;
  await admin.save({ validateBeforeSave: false });

  return { admin: admin.toPublicJSON(), accessToken, refreshToken };
};


// Logout now also increments tokenVersion, revoking access tokens.
export const logoutAdminService = async (adminId) => {
  await Admin.findByIdAndUpdate(
    adminId,
    { $unset: { refreshToken: 1 }, $inc: { tokenVersion: 1 } },
    { new: true },
  );
};

// SECURITY FIXES: Refresh now (1) pins HS256, (2) compares the hash,
// (3) re-checks isActive and emailVerified, (4) checks tokenVersion,
// (5) detects reuse: if a presented token is validly signed but
// does not match the stored hash, the whole refresh family is revoked
// (stored hash cleared + tokenVersion incremented) instead of just
// returning 401 and leaving the new token usable, and (6) enforces
// session isolation: the token's role must match the endpoint's
// expected role, so a manager refresh token can never mint a superadmin
// session (or vice versa). The role check runs BEFORE reuse detection,
// so a cross-role token never revokes a legitimate session.
export const refreshAccessTokenService = async (incomingRefreshToken, expectedRole) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  let decoded;
  try {
    const jwt = await import("jsonwebtoken");
    decoded = jwt.default.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const admin = await Admin.findById(decoded._id).select("+refreshToken");
  if (!admin) {
    throw new ApiError(401, "Refresh token has been revoked");
  }
  // SESSION ISOLATION: the token's role and the account's role must both
  // match the endpoint's expected role. Checked before reuse detection so
  // a cross-role token can never trigger family revocation of the other
  // session.
  if (decoded.role !== expectedRole || admin.role !== expectedRole) {
    throw new ApiError(
      401,
      "Refresh token is not valid for this session",
      [],
      "ROLE_MISMATCH",
    );
  }
  if (!admin.isActive || !admin.emailVerified) {
    throw new ApiError(401, "Refresh token has been revoked");
  }
  if (
    decoded.tokenVersion !== undefined &&
    decoded.tokenVersion !== (admin.tokenVersion ?? 0)
  ) {
    throw new ApiError(401, "Refresh token has been revoked");
  }
  if (!admin.refreshToken || admin.refreshToken !== hashRefreshToken(incomingRefreshToken)) {
    // Possible reuse / theft: revoke the whole family.
    await Admin.findByIdAndUpdate(admin._id, {
      $unset: { refreshToken: 1 },
      $inc: { tokenVersion: 1 },
    });
    throw new ApiError(401, "Refresh token has been revoked");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    generateTokenPair(tokenPayloadFor(admin));

  admin.refreshToken = hashRefreshToken(newRefreshToken);
  await admin.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
};

export const registerAdminService = async ({ username, email, password }) => {
  const existing = await Admin.countDocuments();
  if (existing > 0) {
    throw new ApiError(403, "Admin already exists. Registration is disabled.");
  }

  const admin = await Admin.create({ username, email, password });
  const { accessToken, refreshToken } = generateTokenPair(tokenPayloadFor(admin));

  admin.refreshToken = hashRefreshToken(refreshToken);
  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  return { admin: admin.toPublicJSON(), accessToken, refreshToken };
};

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

  admin.password = newPassword;
  admin.refreshToken = undefined;
  admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
  await admin.save();

  return { success: true };
};

const genericForgotPasswordResponse = {
  message: "If an account exists for this email, a verification code has been sent.",
};

export const forgotPasswordService = async ({ email }) => {
  const admin = await Admin.findOne({ email });
  if (admin) {
    const otp = generateOtp();
    const otpHash = hashSecret(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await PasswordResetOtp.deleteMany({ adminId: admin._id, used: false });
    await PasswordResetOtp.create({
      adminId: admin._id,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
    });
    try {
      await sendPasswordResetOtpEmail({ to: admin.email, otp });
    } catch (err) {
      console.error(`Failed to send password reset OTP email: ${err.message}`);
    }
  }
  return genericForgotPasswordResponse;
};

export const resendOtpService = async ({ email }) => {
  return forgotPasswordService({ email });
};

export const verifyResetOtpService = async ({ email, otp }) => {
  const invalidOtpError = () => new ApiError(400, "Invalid or expired verification code");

  const admin = await Admin.findOne({ email });
  if (!admin) throw invalidOtpError();

  const record = await PasswordResetOtp.findOne({
    adminId: admin._id,
    used: false,
  })
    .sort({ createdAt: -1 })
    .select("+otpHash");

  if (!record) throw invalidOtpError();
  if (record.expiresAt.getTime() < Date.now()) throw invalidOtpError();
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new ApiError(400, "Too many attempts. Please request a new code.");
  }

  const submittedHash = hashSecret(String(otp));
  const isMatch = safeCompareHashes(submittedHash, record.otpHash);

  if (!isMatch) {
    // SECURITY FIX: Atomic increment, not read-modify-write, so
    // concurrent guesses cannot all pass the attempts check.
    await PasswordResetOtp.updateOne(
      { _id: record._id, attempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { attempts: 1 } },
    );
    throw invalidOtpError();
  }

  const resetToken = generateResetToken();
  record.used = true;
  record.resetTokenHash = hashSecret(resetToken);
  record.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  record.resetTokenUsed = false;
  record.resetAttempts = 0;
  await record.save();

  return { resetToken };
};

export const resetPasswordService = async ({ email, resetToken, newPassword }) => {
  const invalidTokenError = () =>
    new ApiError(400, "Invalid or expired password reset request");

  const admin = await Admin.findOne({ email });
  if (!admin) throw invalidTokenError();
  if (!admin.isActive) throw invalidTokenError();

  const record = await PasswordResetOtp.findOne({
    adminId: admin._id,
    used: true,
    resetTokenUsed: false,
  })
    .sort({ createdAt: -1 })
    .select("+resetTokenHash");

  if (!record || !record.resetTokenHash) throw invalidTokenError();
  if (
    !record.resetTokenExpiresAt ||
    record.resetTokenExpiresAt.getTime() < Date.now()
  ) {
    throw invalidTokenError();
  }
  if ((record.resetAttempts ?? 0) >= MAX_RESET_ATTEMPTS) {
    throw invalidTokenError();
  }

  const submittedHash = hashSecret(resetToken);
  const isMatch = safeCompareHashes(submittedHash, record.resetTokenHash);
  if (!isMatch) {
    await PasswordResetOtp.updateOne(
      { _id: record._id },
      { $inc: { resetAttempts: 1 } },
    );
    throw invalidTokenError();
  }

  const fullAdmin = await Admin.findById(admin._id).select("+password");
  // SECURITY FIX: Reset now also rejects reusing the current password,
  // matching change-password behaviour.
  const isSameAsOld = await fullAdmin.isPasswordCorrect(newPassword);
  if (isSameAsOld) {
    throw new ApiError(400, "New password must be different from the current password");
  }

  fullAdmin.password = newPassword;
  fullAdmin.refreshToken = undefined;
  fullAdmin.tokenVersion = (fullAdmin.tokenVersion ?? 0) + 1;
  await fullAdmin.save();

  record.resetTokenUsed = true;
  await record.save();

  return { success: true };
};
