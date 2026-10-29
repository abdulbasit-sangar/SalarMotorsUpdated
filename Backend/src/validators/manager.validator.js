import Joi from "joi";
import { ApiError } from "../utils/apiHelpers.js";

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

// role is intentionally NOT a field here — it can never be submitted
// by the client. The backend hard-codes role: "manager".
const registerManagerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must not exceed 128 characters",
    "any.required": "Password is required",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
  }),
});
export const validateRegisterManager = validate(registerManagerSchema);

const verifyManagerEmailSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
});
export const validateVerifyManagerEmail = validate(verifyManagerEmailSchema);

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});
export const validateResendManagerVerification = validate(resendVerificationSchema);
