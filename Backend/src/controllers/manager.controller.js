import { asyncHandler, ApiResponse } from "../utils/apiHelpers.js";
import {
  registerManagerService,
  verifyManagerEmailService,
  resendManagerVerificationOtpService,
  getAllManagersService,
  getManagerByIdService,
  setManagerActiveStatusService,
  deleteManagerService,
} from "../services/manager.service.js";

// ─── POST /api/managers/register ───────────────────────────────────────────
// Public. Creates a manager account (role is always "manager" — hard-coded
// server-side, see manager.service.js). Account is inactive-for-login until
// the email is verified below.
export const registerManager = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const result = await registerManagerService({ username, email, password });

  return res
    .status(201)
    .json(new ApiResponse(201, { email: result.email }, result.message));
});

// ─── POST /api/managers/verify-email ───────────────────────────────────────
// Public. Confirms ownership of the registered email via OTP.
export const verifyManagerEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const result = await verifyManagerEmailService({ email, otp });

  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// ─── POST /api/managers/resend-verification-otp ────────────────────────────
// Public. Cooldown/rate-limiting applied at the route level.
export const resendManagerVerificationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await resendManagerVerificationOtpService({ email });

  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// ─── GET /api/managers ──────────────────────────────────────────────────────
// Superadmin only (enforced by requireRole in the router).
export const getAllManagers = asyncHandler(async (req, res) => {
  const result = await getAllManagersService();
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Managers fetched successfully"));
});

// ─── GET /api/managers/:id ──────────────────────────────────────────────────
// Superadmin only.
export const getManagerById = asyncHandler(async (req, res) => {
  const manager = await getManagerByIdService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, { manager }, "Manager fetched successfully"));
});

// ─── PATCH /api/managers/:id/activate ───────────────────────────────────────
// Superadmin only.
export const activateManager = asyncHandler(async (req, res) => {
  const manager = await setManagerActiveStatusService(req.params.id, true);
  return res
    .status(200)
    .json(new ApiResponse(200, { manager }, "Manager activated successfully"));
});

// ─── PATCH /api/managers/:id/deactivate ─────────────────────────────────────
// Superadmin only.
export const deactivateManager = asyncHandler(async (req, res) => {
  const manager = await setManagerActiveStatusService(req.params.id, false);
  return res
    .status(200)
    .json(new ApiResponse(200, { manager }, "Manager deactivated successfully"));
});

// ─── DELETE /api/managers/:id ────────────────────────────────────────────────
// Superadmin only.
export const deleteManager = asyncHandler(async (req, res) => {
  await deleteManagerService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Manager deleted successfully"));
});
