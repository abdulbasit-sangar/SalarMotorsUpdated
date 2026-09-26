// New model: PasswordResetOTP — supports the admin forgot-password flow.
// Kept separate from the Admin model so auth-critical, short-lived data
// never touches the existing admin schema.
import mongoose from "mongoose";

const passwordResetOtpSchema = new mongoose.Schema(
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

    // OTP expires ~1 minute after creation. Backend re-checks this on every
    // verify attempt — the frontend countdown is cosmetic only.
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

    // Issued only after successful OTP verification. This is a short-lived,
    // single-purpose token that authorizes ONLY the reset-password step —
    // it is unrelated to the normal admin JWT access/refresh tokens and
    // grants no dashboard/API access.
    resetTokenHash: {
      type: String,
      select: false,
    },

    resetTokenExpiresAt: {
      type: Date,
    },

    resetTokenUsed: {
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
passwordResetOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const PasswordResetOtp = mongoose.model(
  "PasswordResetOtp",
  passwordResetOtpSchema
);

export default PasswordResetOtp;
