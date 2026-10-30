// REPLACE Backend/src/routes/manager.routes.js with the version below.
// It is the security-fixed version, plus POST /login for managers.
// Old public routes (register / verify-email / resend) are unchanged.

import { Router } from "express";
import {
  registerManager,
  verifyManagerEmail,
  resendManagerVerificationOtp,
  getAllManagers,
  getManagerById,
  activateManager,
  deactivateManager,
  deleteManager,
  loginManager,
  refreshManagerToken,
  logoutManager,
  getManagerMe,
  forgotManagerPassword,
  resendManagerResetOtp,
  verifyManagerResetOtp,
  resetManagerPassword,
} from "../controllers/manager.controller.js";
import { verifyJWT, requireRole } from "../middlewares/auth.middleware.js";
import {
  validateRegisterManager,
  validateVerifyManagerEmail,
  validateResendManagerVerification,
} from "../validators/manager.validator.js";
import {
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword,
} from "../validators/auth.validator.js";
import {
  managerRegisterLimiter,
  otpRequestLimiter,
  otpResendLimiter,
  otpVerifyLimiter,
  resetPasswordLimiter,
  refreshLimiter,
  authLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Manager login — manager only, enforced in the service (see loginManager).
router.post("/login", authLimiter, validateLogin, loginManager);

router.post("/register", managerRegisterLimiter, validateRegisterManager, registerManager);
router.post("/verify-email", otpVerifyLimiter, validateVerifyManagerEmail, verifyManagerEmail);
router.post(
  "/resend-verification-otp",
  otpResendLimiter,
  validateResendManagerVerification,
  resendManagerVerificationOtp,
);

// Manager password reset — public, same OTP flow and rate limits as admin.
router.post("/forgot-password", otpRequestLimiter, validateForgotPassword, forgotManagerPassword);
router.post("/resend-otp", otpResendLimiter, validateForgotPassword, resendManagerResetOtp);
router.post("/verify-reset-otp", otpVerifyLimiter, validateVerifyOtp, verifyManagerResetOtp);
router.post("/reset-password", resetPasswordLimiter, validateResetPassword, resetManagerPassword);

// SESSION ISOLATION: manager session endpoints. Strictly manager-only;
// they touch only the manager refresh cookie and the manager's session.
router.post("/refresh", refreshLimiter, refreshManagerToken);
router.post("/logout", verifyJWT, requireRole("manager"), logoutManager);
router.get("/me", verifyJWT, requireRole("manager"), getManagerMe);

router.get("/", verifyJWT, requireRole("superadmin"), getAllManagers);
router.get("/:id", verifyJWT, requireRole("superadmin"), getManagerById);
router.patch("/:id/activate", verifyJWT, requireRole("superadmin"), activateManager);
router.patch("/:id/deactivate", verifyJWT, requireRole("superadmin"), deactivateManager);
router.delete("/:id", verifyJWT, requireRole("superadmin"), deleteManager);

export default router;
