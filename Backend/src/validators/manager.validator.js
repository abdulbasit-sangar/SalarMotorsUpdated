import Joi from "joi";
import { ApiError } from "../utils/apiHelpers.js";

// ─── Middleware factory (same pattern as auth.validator.js) ──────────────────
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    throw new ApiError(400, "Validation failed", messages);
  }

  next();
};

// ─── Manager registration schema ───────────────────────────────────────────
// role is intentionally NOT a field here — it can never be submitted by the
// client. The backend hard-codes role: "manager" in manager.service.js.
const registerManagerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username must not exceed 30 characters",
    "any.required": "Username is required",
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your password",
    }),
});

export const validateRegisterManager = validate(registerManagerSchema);

// ─── Verify email schema ────────────────────────────────────────────────────
const verifyManagerEmailSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "Verification code must be 6 digits",
    "string.pattern.base": "Verification code must be 6 digits",
    "any.required": "Verification code is required",
  }),
});

export const validateVerifyManagerEmail = validate(verifyManagerEmailSchema);

// ─── Resend verification OTP schema ────────────────────────────────────────
const resendVerificationSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const validateResendManagerVerification = validate(resendVerificationSchema);
