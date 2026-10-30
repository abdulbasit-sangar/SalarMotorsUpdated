// Auth API — every function is explicitly wired to ONE session client:
//   - adminSession   → superadmin (cookie: adminRefreshToken)
//   - managerSession → manager   (cookie: managerRefreshToken)
//
// Auth calls must never go through the area-aware apiClient facade:
// login/logout/refresh/me have to target a specific session even when
// called from a page whose URL belongs to the other area.
import {
  adminSession,
  managerSession,
  getActiveApiClient,
} from "../api/client.js";

// ─── Superadmin session ─────────────────────────────────────────────────────

// POST /api/admin/register — one-time only, backend rejects if an admin exists
export const registerAdmin = async ({ username, email, password }) => {
  const { data } = await adminSession.instance.post("/admin/register", {
    username,
    email,
    password,
  });
  adminSession.setAccessToken(data.data.accessToken);
  return data.data.admin;
};

// POST /api/admin/login — SUPERADMIN only.
// The backend enforces expectedRole="superadmin" and issues no tokens
// for a manager account, even with a correct password.
export const loginSuperadmin = async ({ email, password }) => {
  const { data } = await adminSession.instance.post("/admin/login", {
    email,
    password,
  });
  adminSession.setAccessToken(data.data.accessToken);
  return data.data.admin;
};

// Backward-compatible alias. Existing code calling loginAdmin now gets
// the superadmin-only login. Prefer loginSuperadmin / loginManager.
export const loginAdmin = loginSuperadmin;

// POST /api/admin/logout — protected. Clears only the superadmin session:
// the backend clears the adminRefreshToken cookie and revokes only this
// account's tokens. A manager session in the same browser is untouched.
export const logoutAdmin = async () => {
  try {
    await adminSession.instance.post("/admin/logout");
  } finally {
    adminSession.clearAccessToken();
  }
};

// POST /api/admin/refresh — uses the HttpOnly adminRefreshToken cookie
export const refreshSession = async () => {
  const { data } = await adminSession.instance.post("/admin/refresh");
  adminSession.setAccessToken(data.data.accessToken);
  return data.data.accessToken;
};

// GET /api/admin/me — protected, superadmin-only
export const fetchMe = async () => {
  const { data } = await adminSession.instance.get("/admin/me");
  return data.data.admin;
};

// ─── Manager session ────────────────────────────────────────────────────────

// POST /api/managers/login — MANAGER only.
export const loginManager = async ({ email, password }) => {
  const { data } = await managerSession.instance.post("/managers/login", {
    email,
    password,
  });
  managerSession.setAccessToken(data.data.accessToken);
  return data.data.admin;
};

// POST /api/managers/logout — protected. Clears only the manager session:
// the backend clears the managerRefreshToken cookie and revokes only this
// account's tokens. A superadmin session in the same browser is untouched.
export const logoutManager = async () => {
  try {
    await managerSession.instance.post("/managers/logout");
  } finally {
    managerSession.clearAccessToken();
  }
};

// POST /api/managers/refresh — uses the HttpOnly managerRefreshToken cookie
export const refreshManagerSession = async () => {
  const { data } = await managerSession.instance.post("/managers/refresh");
  managerSession.setAccessToken(data.data.accessToken);
  return data.data.accessToken;
};

// GET /api/managers/me — protected, manager-only
export const fetchManagerMe = async () => {
  const { data } = await managerSession.instance.get("/managers/me");
  return data.data.admin;
};

// ─── Manager registration / verification (public, manager-area pages) ───────

// POST /api/managers/register — public. Creates an INACTIVE manager.
// Email verification alone does not activate it; a superadmin must
// activate it before login works (see ManagerPendingPage).
export const registerManager = async ({
  username,
  email,
  password,
  confirmPassword,
}) => {
  const { data } = await managerSession.instance.post("/managers/register", {
    username,
    email,
    password,
    confirmPassword,
  });
  return data.data;
};

// POST /api/managers/verify-email — public.
export const verifyManagerEmail = async ({ email, otp }) => {
  const { data } = await managerSession.instance.post("/managers/verify-email", {
    email,
    otp,
  });
  return data.data;
};

// POST /api/managers/resend-verification-otp — public.
export const resendManagerVerificationOtp = async ({ email }) => {
  const { data } = await managerSession.instance.post(
    "/managers/resend-verification-otp",
    { email },
  );
  return data.data;
};

// ─── Manager management (superadmin only) ───────────────────────────────────

// GET /api/managers — superadmin only
export const fetchManagers = async () => {
  const { data } = await adminSession.instance.get("/managers");
  return data.data.managers;
};

// PATCH /api/managers/:id/activate — superadmin only.
export const activateManager = async (id) => {
  const { data } = await adminSession.instance.patch(
    `/managers/${id}/activate`,
  );
  return data.data.manager;
};

// PATCH /api/managers/:id/deactivate — superadmin only.
export const deactivateManager = async (id) => {
  const { data } = await adminSession.instance.patch(
    `/managers/${id}/deactivate`,
  );
  return data.data.manager;
};

// DELETE /api/managers/:id — superadmin only.
export const deleteManager = async (id) => {
  const { data } = await adminSession.instance.delete(`/managers/${id}`);
  return data.message;
};

// ─── Shared account actions ─────────────────────────────────────────────────

// PATCH /api/admin/change-password — protected. The ProfilePage lives in
// BOTH areas, so this uses the current area's session client: a manager
// changing their password sends the manager token, a superadmin sends the
// superadmin token. The backend clears that role's refresh cookie.
export const changePassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const { data } = await getActiveApiClient().patch("/admin/change-password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return data.data;
};

// ─── Superadmin password recovery (public) ──────────────────────────────────

// POST /api/admin/forgot-password — public. Always returns a generic message.
export const forgotPassword = async ({ email }) => {
  const { data } = await adminSession.instance.post("/admin/forgot-password", {
    email,
  });
  return data.data;
};

// POST /api/admin/resend-otp — public.
export const resendOtp = async ({ email }) => {
  const { data } = await adminSession.instance.post("/admin/resend-otp", {
    email,
  });
  return data.data;
};

// POST /api/admin/verify-reset-otp — public. Returns a short-lived resetToken.
export const verifyResetOtp = async ({ email, otp }) => {
  const { data } = await adminSession.instance.post("/admin/verify-reset-otp", {
    email,
    otp,
  });
  return data.data.resetToken;
};

// POST /api/admin/reset-password — public, authorized via resetToken.
export const resetPassword = async ({
  email,
  resetToken,
  newPassword,
  confirmPassword,
}) => {
  const { data } = await adminSession.instance.post("/admin/reset-password", {
    email,
    resetToken,
    newPassword,
    confirmPassword,
  });
  return data.data;
};

// ─── Manager password recovery (public, manager-area pages) ─────────────────

// POST /api/managers/forgot-password — public. Always returns a generic message.
export const forgotManagerPassword = async ({ email }) => {
  const { data } = await managerSession.instance.post(
    "/managers/forgot-password",
    { email },
  );
  return data.data;
};

// POST /api/managers/resend-otp — public.
export const resendManagerResetOtp = async ({ email }) => {
  const { data } = await managerSession.instance.post("/managers/resend-otp", {
    email,
  });
  return data.data;
};

// POST /api/managers/verify-reset-otp — public. Returns a short-lived resetToken.
export const verifyManagerResetOtp = async ({ email, otp }) => {
  const { data } = await managerSession.instance.post(
    "/managers/verify-reset-otp",
    { email, otp },
  );
  return data.data.resetToken;
};

// POST /api/managers/reset-password — public, authorized via resetToken.
export const resetManagerPassword = async ({
  email,
  resetToken,
  newPassword,
  confirmPassword,
}) => {
  const { data } = await managerSession.instance.post(
    "/managers/reset-password",
    {
      email,
      resetToken,
      newPassword,
      confirmPassword,
    },
  );
  return data.data;
};
