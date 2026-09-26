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
} from "../controllers/manager.controller.js";
import { verifyJWT, requireRole } from "../middlewares/auth.middleware.js";
import {
  validateRegisterManager,
  validateVerifyManagerEmail,
  validateResendManagerVerification,
} from "../validators/manager.validator.js";
import {
  otpRequestLimiter,
  otpResendLimiter,
  otpVerifyLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// ─── Public — manager self-registration + email verification ───────────────
// Reuses the same rate limiters already defined for the forgot-password
// OTP flow — no new limiter configuration introduced.
router.post(
  "/register",
  otpRequestLimiter,
  validateRegisterManager,
  registerManager,
);
router.post(
  "/verify-email",
  otpVerifyLimiter,
  validateVerifyManagerEmail,
  verifyManagerEmail,
);
router.post(
  "/resend-verification-otp",
  otpResendLimiter,
  validateResendManagerVerification,
  resendManagerVerificationOtp,
);

// ─── Superadmin-only manager management ────────────────────────────────────
// Manager login itself goes through the EXISTING /api/admin/login endpoint —
// no separate login route is introduced (loginAdminService now also checks
// emailVerified, see auth.service.js).
router.get("/", verifyJWT, requireRole("superadmin"), getAllManagers);
router.get("/:id", verifyJWT, requireRole("superadmin"), getManagerById);
router.patch(
  "/:id/activate",
  verifyJWT,
  requireRole("superadmin"),
  activateManager,
);
router.patch(
  "/:id/deactivate",
  verifyJWT,
  requireRole("superadmin"),
  deactivateManager,
);
router.delete("/:id", verifyJWT, requireRole("superadmin"), deleteManager);

export default router;
