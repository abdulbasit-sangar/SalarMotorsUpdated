import Admin from "../models/admin.model.js";
import EmailVerificationOtp from "../models/emailVerificationOtp.model.js";
import { ApiError } from "../utils/apiHelpers.js";
import { generateOtp, hashSecret, safeCompareHashes } from "../utils/otpUtils.js";
import { sendManagerVerificationOtpEmail } from "./email.service.js";

const OTP_TTL_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const issueVerificationOtp = async (adminId, email, { swallowSendErrors }) => {
  const otp = generateOtp();
  const otpHash = hashSecret(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

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

// SECURITY FIX — the audit's highest-severity finding:
// Previously a stranger could self-register, verify their own email,
// and immediately log in as a manager with full catalogue control.
// Now registration creates an INACTIVE manager. Email verification
// alone does NOT activate the account. A superadmin must activate it
// via PATCH /api/managers/:id/activate (already superadmin-only).
// Existing managers are unaffected: their isActive is already true.
export const registerManagerService = async ({ username, email, password }) => {
const existing = await Admin.findOne({ email });
if (existing) {
  throw new ApiError(409, "Registration could not be completed with these details");
}


  const manager = await Admin.create({
    username,
    email,
    password,
    role: "manager",
    emailVerified: false,
    isActive: false, // Pending superadmin activation — security fix.
  });

  await issueVerificationOtp(manager._id, manager.email, { swallowSendErrors: false });

  return {
    message:
      "Manager account created. Please check your email for a verification code. Your account will remain inactive until a superadmin activates it.",
    email: manager.email,
  };
};

export const verifyManagerEmailService = async ({ email, otp }) => {
  const invalidOtpError = () => new ApiError(400, "Invalid or expired verification code");

  const manager = await Admin.findOne({ email, role: "manager" });
  if (!manager) throw invalidOtpError();
  if (manager.emailVerified) {
    throw new ApiError(400, "This email is already verified. Please log in.");
  }

  const record = await EmailVerificationOtp.findOne({
    adminId: manager._id,
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
    // Atomic increment, not read-modify-write.
    await EmailVerificationOtp.updateOne(
      { _id: record._id, attempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { attempts: 1 } },
    );
    throw invalidOtpError();
  }

  record.used = true;
  await record.save();

  manager.emailVerified = true;
  await manager.save({ validateBeforeSave: false });

  return {
    message:
      "Email verified successfully. Your account is pending superadmin activation before you can log in.",
  };
};

export const resendManagerVerificationOtpService = async ({ email }) => {
  const manager = await Admin.findOne({ email, role: "manager" });
  if (manager && !manager.emailVerified) {
    await issueVerificationOtp(manager._id, manager.email, { swallowSendErrors: true });
  }
  return {
    message: "If a pending manager account exists for this email, a new verification code has been sent.",
  };
};

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
    manager.refreshToken = undefined;
    manager.tokenVersion = (manager.tokenVersion ?? 0) + 1;
  }
  await manager.save({ validateBeforeSave: false });

  return manager.toPublicJSON();
};

export const deleteManagerService = async (id) => {
  const manager = await Admin.findOne({ _id: id, role: "manager" });
  if (!manager) throw new ApiError(404, "Manager not found");
  await Admin.findByIdAndDelete(id);
};
