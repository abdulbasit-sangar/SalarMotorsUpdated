import Joi from "joi";
import { ApiError } from "../utils/apiHelpers.js";

// SECURITY FIX: All passwords now have a maximum of 128 characters.
// Bcrypt truncates at 72 bytes, so an unlimited length gave a false
// sense of security for very long passphrases. Complexity rules are
// deliberately not added here — they would break existing accounts —
// but the service now enforces lockout and the model enforces min 8.
const passwordRule = Joi.string().min(8).max(128).required().messages({
  "string.min": "Password must be at least 8 characters",
  "string.max": "Password must not exceed 128 characters",
  "any.required": "Password is required",
});

const emailRule = Joi.string().email().lowercase().trim().required().messages({
  "string.email": "Please provide a valid email address",
  "any.required": "Email is required",
});

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

// Login deliberately has NO max length: an existing account whose
// password was created before the 128-char cap must still be able to
// log in (bcrypt truncates at 72 bytes anyway). The cap applies only
// to new passwords in register/change/reset.
const loginSchema = Joi.object({
  email: emailRule,
  password: Joi.string().min(8).required(),
});
export const validateLogin = validate(loginSchema);

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: emailRule,
  password: passwordRule,
});
export const validateRegister = validate(registerSchema);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required().messages({
    "string.min": "New password must be at least 8 characters",
    "string.max": "New password must not exceed 128 characters",
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your new password",
  }),
});
export const validateChangePassword = validate(changePasswordSchema);

const forgotPasswordSchema = Joi.object({ email: emailRule });
export const validateForgotPassword = validate(forgotPasswordSchema);

const verifyOtpSchema = Joi.object({
  email: emailRule,
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "Verification code must be 6 digits",
    "string.pattern.base": "Verification code must be 6 digits",
    "any.required": "Verification code is required",
  }),
});
export const validateVerifyOtp = validate(verifyOtpSchema);

const resetPasswordSchema = Joi.object({
  email: emailRule,
  resetToken: Joi.string().required().messages({
    "any.required": "Reset authorization is missing",
  }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    "string.min": "New password must be at least 8 characters",
    "string.max": "New password must not exceed 128 characters",
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your new password",
  }),
});
export const validateResetPassword = validate(resetPasswordSchema);
