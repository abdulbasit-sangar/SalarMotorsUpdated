// Added validateRegister middleware for one-time admin registration.
import Joi from "joi";
import { ApiError } from "../utils/apiHelpers.js";

// ─── Login schema ─────────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
});

// ─── Middleware factory ───────────────────────────────────────────────────────
// Validates req.body against the given Joi schema.
// Throws ApiError(400) with all validation messages on failure.
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,           // collect all errors, not just first
    allowUnknown: false,         // reject unexpected fields
    stripUnknown: true,          // strip fields not in schema
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    throw new ApiError(400, "Validation failed", messages);
  }

  next();
};

export const validateLogin = validate(loginSchema);

// ─── Register schema ────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    "string.min": "Username must be at least 3 characters",
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
});

export const validateRegister = validate(registerSchema);

// ─── Change password schema (Flow 1) ──────────────────────────────────────────
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters",
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

export const validateChangePassword = validate(changePasswordSchema);

// ─── Forgot password schema (Flow 2, step 1) ──────────────────────────────────
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const validateForgotPassword = validate(forgotPasswordSchema);

// ─── Verify OTP schema (Flow 2, step 2) ───────────────────────────────────────
const verifyOtpSchema = Joi.object({
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

export const validateVerifyOtp = validate(verifyOtpSchema);

// ─── Reset password schema (Flow 2, step 3) ───────────────────────────────────
const resetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  resetToken: Joi.string().required().messages({
    "any.required": "Reset authorization is missing",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters",
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

export const validateResetPassword = validate(resetPasswordSchema);
