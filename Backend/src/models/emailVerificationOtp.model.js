// New model: EmailVerificationOtp — supports the Manager/Sub-Admin
// registration email-ownership verification flow.
// Deliberately mirrors passwordResetOtp.model.js: same hashing approach,
// same TTL cleanup pattern, same "never store the plaintext OTP" rule.
// Kept as its own collection (rather than reusing PasswordResetOtp) because
// it protects a different action (activating a brand-new account) and must
// never be confused with — or accidentally satisfy — a password-reset check.
import mongoose from "mongoose";

const emailVerificationOtpSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    // Hash of the 6-digit OTP — the plaintext OTP is never stored.
    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    // OTP expires ~1 minute after creation, matching the existing
    // password-reset OTP TTL. The backend re-checks this on every verify
    // attempt — any frontend countdown is cosmetic only.
    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    // Set once the OTP has been correctly verified. A used OTP can never
    // be verified again, even if it hasn't technically expired yet.
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index — MongoDB automatically deletes documents 1 hour after
// createdAt, so expired/used OTP records don't accumulate indefinitely.
emailVerificationOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const EmailVerificationOtp = mongoose.model(
  "EmailVerificationOtp",
  emailVerificationOtpSchema
);

export default EmailVerificationOtp;
