// Manager/Sub-Admin RBAC — service layer.
//
// Reuses the existing Admin model, bcrypt hashing (via its pre-save hook),
// OTP utils, and ApiError conventions from the rest of the app. No new
// auth framework is introduced — this extends the existing one.
import Admin from "../models/admin.model.js";
import EmailVerificationOtp from "../models/emailVerificationOtp.model.js";
import { ApiError } from "../utils/apiHelpers.js";
import { generateOtp, hashSecret, safeCompareHashes } from "../utils/otpUtils.js";
import { sendManagerVerificationOtpEmail } from "./email.service.js";

const OTP_TTL_MS = 60 * 1000; // 1 minute — matches the password-reset OTP TTL
const MAX_OTP_ATTEMPTS = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Registration — always creates role: "manager". The role is never accepted
// from client input; it is hard-coded here so a manager can never register
// themselves (or anyone else) as "superadmin".
// ─────────────────────────────────────────────────────────────────────────────

// issueVerificationOtp — creates and persists a fresh OTP. The caller
// decides how to handle an email-send failure via `swallowSendErrors`:
//   - registration: the account's existence is already known to the caller
//     (we just told them it was created), so a send failure should be
//     reported honestly rather than hidden behind a false "OTP sent"
//     message — that's what caused OTPs to silently never arrive.
//   - resend: must keep swallowing send errors, same as the existing
//     forgot-password flow, so the response can't be used to probe which
//     emails have manager accounts (account-enumeration protection).
const issueVerificationOtp = async (adminId, email, { swallowSendErrors }) => {
  const otp = generateOtp();
  const otpHash = hashSecret(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // A new OTP request invalidates any previous, still-pending OTP —
  // same pattern as the existing forgot-password flow.
  await EmailVerificationOtp.deleteMany({ adminId, used: false });

  await EmailVerificationOtp.create({
    adminId,
    otpHash,
    expiresAt,
    attempts: 0,
    used: false,
  });

  try {
    await sendManagerVerificationOtpEmail({ to: email, otp });
  } catch (err) {
    console.error(`Failed to send manager verification OTP email: ${err.message}`);
    if (!swallowSendErrors) {
      throw new ApiError(
        502,
        "Manager account created, but the verification email could not be sent. Please check the server's SMTP configuration and use \"Resend OTP\" once fixed.",
      );
    }
  }
};

export const registerManagerService = async ({ username, email, password }) => {
  const existing = await Admin.findOne({ email });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const manager = await Admin.create({
    username,
    email,
    password,
    role: "manager",       // hard-coded — never trust client input for role
    emailVerified: false,  // gated until OTP verification succeeds
  });

  // Don't swallow the send error here — the account's existence is already
  // known (we're about to tell the caller it was created), so honesty is
  // safe and far more useful than a false "OTP sent" success message.
  await issueVerificationOtp(manager._id, manager.email, { swallowSendErrors: false });

  return {
    message:
      "Manager account created. Please check your email for a verification code.",
    email: manager.email,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Email verification
// ─────────────────────────────────────────────────────────────────────────────

export const verifyManagerEmailService = async ({ email, otp }) => {
  const invalidOtpError = () => new ApiError(400, "Invalid or expired verification code");

  const manager = await Admin.findOne({ email, role: "manager" });
  if (!manager) {
    throw invalidOtpError();
  }

  if (manager.emailVerified) {
    throw new ApiError(400, "This email is already verified. Please log in.");
  }

  const record = await EmailVerificationOtp.findOne({
    adminId: manager._id,
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

  record.used = true;
  await record.save();

  manager.emailVerified = true;
  await manager.save({ validateBeforeSave: false });

  return { message: "Email verified successfully. You can now log in." };
};

export const resendManagerVerificationOtpService = async ({ email }) => {
  const manager = await Admin.findOne({ email, role: "manager" });

  // Generic response regardless of match — same account-enumeration
  // protection pattern as the existing forgot-password flow. Send errors
  // are swallowed here (unlike registration) so a failure can't be used
  // to infer that a given email has a manager account.
  if (manager && !manager.emailVerified) {
    await issueVerificationOtp(manager._id, manager.email, { swallowSendErrors: true });
  }

  return {
    message: "If a pending manager account exists for this email, a new verification code has been sent.",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin-only manager management
// ─────────────────────────────────────────────────────────────────────────────

export const getAllManagersService = async () => {
  const managers = await Admin.find({ role: "manager" })
    .select("username email role isActive emailVerified lastLogin createdAt")
    .sort({ createdAt: -1 })
    .lean();
  return { managers };
};

export const getManagerByIdService = async (id) => {
  const manager = await Admin.findOne({ _id: id, role: "manager" })
    .select("username email role isActive emailVerified lastLogin createdAt")
    .lean();
  if (!manager) throw new ApiError(404, "Manager not found");
  return manager;
};

export const setManagerActiveStatusService = async (id, isActive) => {
  const manager = await Admin.findOne({ _id: id, role: "manager" });
  if (!manager) throw new ApiError(404, "Manager not found");

  manager.isActive = isActive;
  if (!isActive) {
    // Immediately revoke any existing session on deactivation.
    manager.refreshToken = undefined;
  }
  await manager.save({ validateBeforeSave: false });

  return manager.toPublicJSON();
};

export const deleteManagerService = async (id) => {
  const manager = await Admin.findOne({ _id: id, role: "manager" });
  if (!manager) throw new ApiError(404, "Manager not found");

  await Admin.findByIdAndDelete(id);
};
