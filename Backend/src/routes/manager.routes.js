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
} from "../controllers/manager.controller.js";
import { verifyJWT, requireRole } from "../middlewares/auth.middleware.js";
import {
  validateRegisterManager,
  validateVerifyManagerEmail,
  validateResendManagerVerification,
} from "../validators/manager.validator.js";
import { validateLogin } from "../validators/auth.validator.js";
import {
  managerRegisterLimiter,
  otpResendLimiter,
  otpVerifyLimiter,
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

router.get("/", verifyJWT, requireRole("superadmin"), getAllManagers);
router.get("/:id", verifyJWT, requireRole("superadmin"), getManagerById);
router.patch("/:id/activate", verifyJWT, requireRole("superadmin"), activateManager);
router.patch("/:id/deactivate", verifyJWT, requireRole("superadmin"), deactivateManager);
router.delete("/:id", verifyJWT, requireRole("superadmin"), deleteManager);

export default router;
