import { Router } from "express";
import { requireSetupToken } from "../middlewares/setup.middleware.js";
import {
  loginAdmin,
  logoutAdmin,
  refreshAccessToken,
  getMe,
  registerAdmin,
  changePassword,
  forgotPassword,
  resendOtp,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  validateLogin,
  validateRegister,
  validateChangePassword,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword,
} from "../validators/auth.validator.js";
import {
  authLimiter,
  otpRequestLimiter,
  otpResendLimiter,
  otpVerifyLimiter,
  refreshLimiter,
  resetPasswordLimiter,
  adminRegisterLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

router.get("/csrf", (req, res) => {
  res.status(204).end();
});

// SECURITY FIX: Admin registration now has its own limiter, and
// refresh / reset-password previously had none.
router.post("/register", adminRegisterLimiter, requireSetupToken, validateRegister, registerAdmin);
router.post("/login", authLimiter, validateLogin, loginAdmin);
router.post("/refresh", refreshLimiter, refreshAccessToken);

router.post("/forgot-password", otpRequestLimiter, validateForgotPassword, forgotPassword);
router.post("/resend-otp", otpResendLimiter, validateForgotPassword, resendOtp);
router.post("/verify-reset-otp", otpVerifyLimiter, validateVerifyOtp, verifyResetOtp);
router.post("/reset-password", resetPasswordLimiter, validateResetPassword, resetPassword);

router.post("/logout", verifyJWT, logoutAdmin);
router.get("/me", verifyJWT, getMe);
router.patch("/change-password", verifyJWT, validateChangePassword, changePassword);

export default router;
