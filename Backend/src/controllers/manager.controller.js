import { asyncHandler, ApiResponse } from "../utils/apiHelpers.js";
import { cookieOptions, refreshCookieNameForRole } from "../utils/tokenUtils.js";
import {
  loginAdminService,
  logoutAdminService,
  refreshAccessTokenService,
} from "../services/auth.service.js";

import {
  registerManagerService,
  verifyManagerEmailService,
  resendManagerVerificationOtpService,
  getAllManagersService,
  getManagerByIdService,
  setManagerActiveStatusService,
  deleteManagerService,
} from "../services/manager.service.js";
import {
  forgotPasswordService,
  resendOtpService,
  verifyResetOtpService,
  resetPasswordService,
} from "../services/auth.service.js";


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

// ─── POST /api/managers/login — manager only ────────────────────────────
export const loginManager = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { admin, accessToken, refreshToken } = await loginAdminService({
    email,
    password,
    expectedRole: "manager",
  });

  return res
    .status(200)
    .cookie(refreshCookieNameForRole("manager"), refreshToken, cookieOptions)
    .json(new ApiResponse(200, { admin, accessToken }, "Login successful"));
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

// ─── POST /api/managers/forgot-password ────────────────────────────────────
// Public. Manager password reset — same OTP flow as the admin endpoint:
// generic response (no account enumeration), code by email. Delegates to
// the shared auth service (managers live in the same Admin collection,
// so no new service logic is needed).
export const forgotManagerPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await forgotPasswordService({ email });

  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// ─── POST /api/managers/resend-otp ─────────────────────────────────────────
// Public. Cooldown/rate-limiting applied at the route level.
export const resendManagerResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await resendOtpService({ email });

  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// ─── POST /api/managers/verify-reset-otp ───────────────────────────────────
// Public. On success, returns a short-lived resetToken that ONLY permits
// the reset-password step — not a normal manager session.
export const verifyManagerResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { resetToken } = await verifyResetOtpService({ email, otp });

  return res
    .status(200)
    .json(new ApiResponse(200, { resetToken }, "Verification code confirmed"));
});

// ─── POST /api/managers/reset-password ─────────────────────────────────────
// Public — authorized only via the short-lived resetToken from
// verify-reset-otp.
export const resetManagerPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, newPassword } = req.body;

  await resetPasswordService({ email, resetToken, newPassword });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset successfully. Please log in with your new password."
      )
    );
});

// ─── POST /api/managers/refresh ────────────────────────────────────────────
// Issues a new manager access token using the HttpOnly manager refresh
// cookie. Strictly manager-only: a superadmin refresh token presented here
// is rejected WITHOUT revoking any session (see auth.service.js).
export const refreshManagerToken = asyncHandler(async (req, res) => {
  const cookieName = refreshCookieNameForRole("manager");
  const incomingRefreshToken = req.cookies?.[cookieName];

  const { accessToken, refreshToken: newRefreshToken } =
    await refreshAccessTokenService(incomingRefreshToken, "manager");

  return res
    .status(200)
    .cookie(cookieName, newRefreshToken, cookieOptions)
    .json(
      new ApiResponse(200, { accessToken }, "Access token refreshed")
    );
});

// ─── POST /api/managers/logout ─────────────────────────────────────────────
// Protected — requires a valid manager access token. Clears ONLY the
// manager refresh cookie and revokes ONLY the manager's session; a
// superadmin session in the same browser is untouched.
export const logoutManager = asyncHandler(async (req, res) => {
  await logoutAdminService(req.admin._id);

  return res
    .status(200)
    .clearCookie(refreshCookieNameForRole("manager"), cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ─── GET /api/managers/me ──────────────────────────────────────────────────
// Returns the currently logged-in manager's public profile.
// Protected — req.admin is set by verifyJWT, role enforced in the router.
export const getManagerMe = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { admin: req.admin }, "Manager profile fetched"));
});
