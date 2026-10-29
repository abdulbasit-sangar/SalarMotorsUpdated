import { apiClient, setAccessToken } from "../api/client.js";

// POST /api/admin/register — one-time only, backend rejects if an admin exists
export const registerAdmin = async ({ username, email, password }) => {
  const { data } = await apiClient.post("/admin/register", { username, email, password });
  setAccessToken(data.data.accessToken);
  return data.data.admin;
};

// POST /api/admin/login — SUPERADMIN only.
// The backend enforces expectedRole="superadmin" and issues no tokens
// for a manager account, even with a correct password.
export const loginSuperadmin = async ({ email, password }) => {
  const { data } = await apiClient.post("/admin/login", { email, password });
  setAccessToken(data.data.accessToken);
  return data.data.admin;
};

// Backward-compatible alias. Existing code calling loginAdmin now gets
// the superadmin-only login. Prefer loginSuperadmin / loginManager.
export const loginAdmin = loginSuperadmin;

// POST /api/managers/login — MANAGER only.
export const loginManager = async ({ email, password }) => {
  const { data } = await apiClient.post("/managers/login", { email, password });
  setAccessToken(data.data.accessToken);
  return data.data.admin;
};

// POST /api/admin/logout — protected
export const logoutAdmin = async () => {
  try {
    await apiClient.post("/admin/logout");
  } finally {
    setAccessToken(null);
  }
};

// POST /api/admin/refresh — uses HttpOnly cookie, no body
export const refreshSession = async () => {
  const { data } = await apiClient.post("/admin/refresh");
  setAccessToken(data.data.accessToken);
  return data.data.accessToken;
};

// GET /api/admin/me — protected
export const fetchMe = async () => {
  const { data } = await apiClient.get("/admin/me");
  return data.data.admin;
};

// POST /api/managers/register — public. Creates an INACTIVE manager.
// Email verification alone does not activate it; a superadmin must
// activate it before login works (see ManagerPendingPage).
export const registerManager = async ({ username, email, password, confirmPassword }) => {
  const { data } = await apiClient.post("/managers/register", {
    username,
    email,
    password,
    confirmPassword,
  });
  return data.data;
};

// POST /api/managers/verify-email — public.
export const verifyManagerEmail = async ({ email, otp }) => {
  const { data } = await apiClient.post("/managers/verify-email", { email, otp });
  return data.data;
};

// POST /api/managers/resend-verification-otp — public.
export const resendManagerVerificationOtp = async ({ email }) => {
  const { data } = await apiClient.post("/managers/resend-verification-otp", { email });
  return data.data;
};

// GET /api/managers — superadmin only
export const fetchManagers = async () => {
  const { data } = await apiClient.get("/managers");
  return data.data.managers;
};

// PATCH /api/managers/:id/activate — superadmin only.
export const activateManager = async (id) => {
  const { data } = await apiClient.patch(`/managers/${id}/activate`);
  return data.data.manager;
};

// PATCH /api/managers/:id/deactivate — superadmin only.
export const deactivateManager = async (id) => {
  const { data } = await apiClient.patch(`/managers/${id}/deactivate`);
  return data.data.manager;
};

// DELETE /api/managers/:id — superadmin only.
export const deleteManager = async (id) => {
  const { data } = await apiClient.delete(`/managers/${id}`);
  return data.message;
};

// PATCH /api/admin/change-password — protected
export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const { data } = await apiClient.patch("/admin/change-password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return data.data;
};

// POST /api/admin/forgot-password — public. Always returns a generic message.
export const forgotPassword = async ({ email }) => {
  const { data } = await apiClient.post("/admin/forgot-password", { email });
  return data.data;
};

// POST /api/admin/resend-otp — public.
export const resendOtp = async ({ email }) => {
  const { data } = await apiClient.post("/admin/resend-otp", { email });
  return data.data;
};

// POST /api/admin/verify-reset-otp — public. Returns a short-lived resetToken.
export const verifyResetOtp = async ({ email, otp }) => {
  const { data } = await apiClient.post("/admin/verify-reset-otp", { email, otp });
  return data.data.resetToken;
};

// POST /api/admin/reset-password — public, authorized via resetToken.
export const resetPassword = async ({ email, resetToken, newPassword, confirmPassword }) => {
  const { data } = await apiClient.post("/admin/reset-password", {
    email,
    resetToken,
    newPassword,
    confirmPassword,
  });
  return data.data;
};
