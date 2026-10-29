import mongoose from "mongoose";

const passwordResetOtpSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date },
    resetTokenUsed: { type: Boolean, default: false },
    // SECURITY FIX: Attempt limit for the reset-token step itself.
    // Previously resetPassword had no counter at all.
    resetAttempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// SECURITY FIX: Records are deleted 10 minutes after creation, not
// 1 hour. OTP validity is 1 minute and reset-token validity is
// 10 minutes, so there is no reason to retain hashes for an hour.
passwordResetOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

const PasswordResetOtp = mongoose.model("PasswordResetOtp", passwordResetOtpSchema);

export default PasswordResetOtp;
