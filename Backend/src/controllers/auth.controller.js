// Added register controller: handles one-time admin registration.
// This file defines auth-related controllers (login, logout, refresh, me).
//
// Also added: change-password + forgot-password/OTP/reset-password
// controllers for the new Admin Password Management feature.
import { asyncHandler, ApiResponse } from "../utils/apiHelpers.js";
import { cookieOptions } from "../utils/tokenUtils.js";
import {
  loginAdminService,
  logoutAdminService,
  refreshAccessTokenService,
  registerAdminService,
  changePasswordService,
  forgotPasswordService,
  resendOtpService,
  verifyResetOtpService,
  resetPasswordService,
} from "../services/auth.service.js";

// ─── POST /api/admin/login ────────────────────────────────────────────────────
export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { admin, accessToken, refreshToken } = await loginAdminService({
    email,
    password,
  });

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions) // HttpOnly, Secure, SameSite
    .json(
      new ApiResponse(200, { admin, accessToken }, "Login successful")
    );
});

// ─── POST /api/admin/logout ───────────────────────────────────────────────────
// Protected — requires valid access token (verifyJWT middleware applied in router)
export const logoutAdmin = asyncHandler(async (req, res) => {
  await logoutAdminService(req.admin._id);

  return res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ─── POST /api/admin/refresh ──────────────────────────────────────────────────
// Issues a new access token using the HttpOnly refresh token cookie.
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  const { accessToken, refreshToken: newRefreshToken } =
    await refreshAccessTokenService(incomingRefreshToken);

  return res
    .status(200)
    .cookie("refreshToken", newRefreshToken, cookieOptions)
    .json(
      new ApiResponse(200, { accessToken }, "Access token refreshed")
    );
});

// ─── GET /api/admin/me ────────────────────────────────────────────────────────
// Returns the currently logged-in admin's public profile.
// Protected — req.admin is set by verifyJWT middleware.
export const getMe = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { admin: req.admin }, "Admin profile fetched"));
});

// ─── POST /api/admin/register ────────────────────────────────────────────────
// One-time registration endpoint. Service enforces "register once" rule.
export const registerAdmin = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const { admin, accessToken, refreshToken } = await registerAdminService({
    username,
    email,
    password,
  });

  return res
    .status(201)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(201, { admin, accessToken }, "Admin registered successfully"));
});

// ─── PATCH /api/admin/change-password ─────────────────────────────────────────
// Protected — requires valid access token. Admin already knows current password.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await changePasswordService({
    adminId: req.admin._id,
    currentPassword,
    newPassword,
  });

  return res
    .status(200)
    .clearCookie("refreshToken", cookieOptions) // existing session invalidated
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please log in again."
      )
    );
});

// ─── POST /api/admin/forgot-password ──────────────────────────────────────────
// Public. Always returns a generic response — never reveals account existence.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await forgotPasswordService({ email });

  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// ─── POST /api/admin/resend-otp ───────────────────────────────────────────────
// Public. Cooldown/rate-limiting applied at the route level.
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await resendOtpService({ email });

  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// ─── POST /api/admin/verify-reset-otp ─────────────────────────────────────────
// Public. On success, returns a short-lived reset-authorization token that
// ONLY permits the reset-password step — not a normal admin session.
export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { resetToken } = await verifyResetOtpService({ email, otp });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { resetToken }, "Verification code confirmed")
    );
});

// ─── POST /api/admin/reset-password ───────────────────────────────────────────
// Public — authorized only via the short-lived resetToken from verify-reset-otp.
export const resetPassword = asyncHandler(async (req, res) => {
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
