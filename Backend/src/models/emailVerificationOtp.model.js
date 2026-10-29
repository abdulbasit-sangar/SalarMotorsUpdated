import mongoose from "mongoose";

const emailVerificationOtpSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
);

// SECURITY FIX: 10 minutes, not 1 hour, matching the flow's lifetime.
emailVerificationOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

const EmailVerificationOtp = mongoose.model(
  "EmailVerificationOtp",
  emailVerificationOtpSchema,
);

export default EmailVerificationOtp;
