import axios from "axios";
import { getDeviceId } from "../../shared/utils/deviceId.js";
import i18n from "../../i18n/index.js";
import { localizeApiMessage } from "./apiMessages.js";

// Base URL comes from env. In PRODUCTION builds the variable is REQUIRED:
// a missing VITE_API_URL would silently bake in the localhost fallback and
// ship a completely dead app. Fail the build instead, loudly.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  throw new Error(
    "VITE_API_URL is not set. Build with e.g. VITE_API_URL=https://<backend-host>/api npm run build",
  );
}
export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const readCookie = (name) => {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

export const CSRF_TIMEOUT_MS = 10000;

const ensureCsrfToken = async () => {
  let token = readCookie("csrfToken");
  if (token) return token;

  await axios.get(`${BASE_URL}/admin/csrf`, {
    withCredentials: true,
    timeout: CSRF_TIMEOUT_MS,
  });
token = readCookie("csrfToken");
  return token;
};

export const UPLOAD_TIMEOUT_MS = 120000;

// Anonymous favorites are scoped by X-Device-Id, not by a cookie session, and
// the backend exempts them from CSRF (see csrf.middleware.js). They must not
// depend on the Admin CSRF handshake. Everything else keeps CSRF.
const isAnonymousFavoritesRequest = (config) =>
  /^\/favorites(\/|$)/.test(config.url || "");

// ─── Session-isolated API clients ────────────────────────────────────────────
// Each role (superadmin / manager) gets its own axios instance with:
//   - its own in-memory access token (never shared, never persisted),
//   - its own single-flight 401 → refresh queue,
//   - its own refresh endpoint (each backed by a separate HttpOnly
//     refresh-token cookie on the backend: adminRefreshToken /
//     managerRefreshToken),
//   - its own logout event, so one session expiring or logging out never
//     touches the other session's UI state.
//
// This is what makes simultaneous superadmin + manager sessions possible
// in the same browser: the two cookies coexist, and each client only ever
// reads, refreshes, and clears its own.

// Auth endpoints that must NEVER trigger the silent-refresh flow.
// A 401 from one of these is a real authentication failure (wrong
// password, bad OTP) and must surface to the caller as-is.
const AUTH_ROUTES = {
  superadmin: ["/admin/login", "/admin/register", "/admin/refresh"],
  manager: [
    "/managers/login",
    "/managers/register",
    "/managers/refresh",
    "/managers/verify-email",
    "/managers/resend-verification-otp",
    "/managers/forgot-password",
    "/managers/resend-otp",
    "/managers/verify-reset-otp",
    "/managers/reset-password",
  ],
};

const createSessionClient = ({ role, refreshPath, logoutEvent }) => {
  const instance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // send/receive the HttpOnly refresh cookies
    timeout: 15000,
  });

  // In-memory access token. Deliberately NOT persisted to localStorage:
  // the refresh token already lives in an HttpOnly cookie, and keeping the
  // access token out of storage limits XSS blast radius. On a hard reload
  // each AuthProvider session calls its own refresh endpoint once to
  // re-hydrate.
  let accessToken = null;
  let isRefreshing = false;
  let pendingQueue = [];

  const setAccessToken = (token) => {
    accessToken = token;
  };
  const getAccessToken = () => accessToken;
  const clearAccessToken = () => {
    accessToken = null;
  };

  const flushQueue = (error, token = null) => {
    pendingQueue.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else resolve(token);
    });
    pendingQueue = [];
  };

  instance.interceptors.request.use(async (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // Sent on every request (harmless where unused) — required by the
    // Favorites endpoints to scope favorites per anonymous device. See
    // shared/utils/deviceId.js.
    config.headers["X-Device-Id"] = getDeviceId();
    if (
      ["post", "put", "patch", "delete"].includes(
        config.method?.toLowerCase(),
      ) &&
      !isAnonymousFavoritesRequest(config)
    ) {
      const csrfToken = await ensureCsrfToken();
      if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
    }
    return config;
  });

  // ─── 401 handling: attempt exactly one silent refresh, then retry ─────────
  // Concurrent 401s are queued behind a single in-flight refresh call so we
  // never fire multiple refresh requests at once. The queue is per-client,
  // so a superadmin refresh never blocks (or resolves) manager requests.
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;

      const isAuthRoute = AUTH_ROUTES[role].some((p) =>
        originalRequest?.url?.includes(p),
      );

      if (status !== 401 || isAuthRoute || originalRequest._retry) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}${refreshPath}`,
          {},
          {
            withCredentials: true,
            timeout: CSRF_TIMEOUT_MS,
            headers: { "X-CSRF-Token": await ensureCsrfToken() },
          },
        );
        const newToken = data?.data?.accessToken;
        setAccessToken(newToken);
        flushQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        setAccessToken(null);
        // Role-scoped: only this role's session is marked dead. The other
        // role's AuthProvider session is untouched.
        window.dispatchEvent(new CustomEvent(logoutEvent));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return {
    role,
    instance,
    refreshPath,
    logoutEvent,
    setAccessToken,
    getAccessToken,
    clearAccessToken,
  };
};

export const adminSession = createSessionClient({
  role: "superadmin",
  refreshPath: "/admin/refresh",
  logoutEvent: "auth:logout:superadmin",
});

export const managerSession = createSessionClient({
  role: "manager",
  refreshPath: "/managers/refresh",
  logoutEvent: "auth:logout:manager",
});

// ─── Area-aware client selection ─────────────────────────────────────────────
// Components under /manager/* talk with the manager session; everything else
// (admin area + public site) uses the superadmin session. Public endpoints
// ignore the Authorization header, so carrying a token there is harmless.
// Resolved at call time (not import time) so it stays correct across
// client-side navigation.
export const getActiveApiClient = () =>
  typeof window !== "undefined" &&
  window.location.pathname.startsWith("/manager/")
    ? managerSession.instance
    : adminSession.instance;

// Backward-compatible facade: existing API modules (cars, favorites, …)
// keep calling apiClient.get/post/put/patch/delete unchanged. Each call is
// delegated to the current area's session client at call time, so no call
// site needs to know which session is active.
const delegate = (method) => (...args) => getActiveApiClient()[method](...args);
export const apiClient = {
  get: delegate("get"),
  post: delegate("post"),
  put: delegate("put"),
  patch: delegate("patch"),
  delete: delegate("delete"),
  request: delegate("request"),
};

/**
 * Normalizes any error thrown by apiClient into a plain, UI-friendly shape.
 * Backend errors follow { success, statusCode, message, errors: [] }.
 */
export const parseApiError = (error) => {
  if (error?.response?.data) {
    const { message, errors } = error.response.data;
    return {
      message: message
        ? localizeApiMessage(message)
        : i18n.t("server.generic", { ns: "errors" }),
      errors: Array.isArray(errors) ? errors.map(localizeApiMessage) : [],
      status: error.response.status,
    };
  }
  if (error?.request) {
    return {
      message: i18n.t("server.network", { ns: "errors" }),
      errors: [],
      status: null,
    };
  }
  return {
    message: error?.message || i18n.t("server.unexpected", { ns: "errors" }),
    errors: [],
    status: null,
  };
};
