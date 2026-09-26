// Added POST /register route for one-time admin registration.
// Added routes for Admin Password Management: change-password (protected)
// and forgot-password / resend-otp / verify-reset-otp / reset-password (public).
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
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

router.get("/csrf", (req, res) => {
  res.status(204).end();
});

// ─── Public routes ─────────────────────────────────────────────────────────────
// authLimiter: max 10 login attempts / 15min per IP — brute-force protection
// Public: one-time registration (service enforces existing-admin check)
router.post("/register", requireSetupToken, validateRegister, registerAdmin);
router.post("/login", authLimiter, validateLogin, loginAdmin);
router.post("/refresh", refreshAccessToken);

// ─── Forgot password (public) ───────────────────────────────────────────────────
router.post(
  "/forgot-password",
  otpRequestLimiter,
  validateForgotPassword,
  forgotPassword,
);
router.post("/resend-otp", otpResendLimiter, validateForgotPassword, resendOtp);
router.post(
  "/verify-reset-otp",
  otpVerifyLimiter,
  validateVerifyOtp,
  verifyResetOtp,
);
router.post("/reset-password", validateResetPassword, resetPassword);

// ─── Protected routes ──────────────────────────────────────────────────────────
router.post("/logout", verifyJWT, logoutAdmin);
router.get("/me", verifyJWT, getMe);
router.patch(
  "/change-password",
  verifyJWT,
  validateChangePassword,
  changePassword,
);

export default router;
