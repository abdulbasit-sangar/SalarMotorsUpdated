import axios from "axios";
import { getDeviceId } from "../../shared/utils/deviceId.js";

// Base URL comes from env — set VITE_API_URL in .env for each environment.
export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// In-memory access token. Deliberately NOT persisted to localStorage:
// the refresh token already lives in an HttpOnly cookie, and keeping the
// access token out of storage limits XSS blast radius. On a hard reload
// the app calls /admin/refresh once (see AuthProvider) to re-hydrate this.
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

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

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send/receive the HttpOnly refreshToken cookie
  timeout: 15000,
});

export const UPLOAD_TIMEOUT_MS = 120000;

apiClient.interceptors.request.use(async (config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // Sent on every request (harmless where unused) — required by the
  // Favorites endpoints to scope favorites per anonymous device. See
  // shared/utils/deviceId.js.
  config.headers["X-Device-Id"] = getDeviceId();
  if (
    ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())
  ) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

// ─── 401 handling: attempt exactly one silent refresh, then retry ───────────
// Concurrent 401s are queued behind a single in-flight refresh call so we
// never fire multiple refresh requests at once.
let isRefreshing = false;
let pendingQueue = [];

const flushQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthRoute =
      originalRequest?.url?.includes("/admin/login") ||
      originalRequest?.url?.includes("/admin/register") ||
      originalRequest?.url?.includes("/admin/refresh");

    if (status !== 401 || isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/admin/refresh`,
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
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      setAccessToken(null);
      // Let subscribers (AuthProvider) know the session is dead.
      window.dispatchEvent(new CustomEvent("auth:logout"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/**
 * Normalizes any error thrown by apiClient into a plain, UI-friendly shape.
 * Backend errors follow { success, statusCode, message, errors: [] }.
 */
export const parseApiError = (error) => {
  if (error?.response?.data) {
    const { message, errors } = error.response.data;
    return {
      message: message || "Something went wrong. Please try again.",
      errors: Array.isArray(errors) ? errors : [],
      status: error.response.status,
    };
  }
  if (error?.request) {
    return {
      message: "Can't reach the server. Check your connection and try again.",
      errors: [],
      status: null,
    };
  }
  return {
    message: error?.message || "Unexpected error.",
    errors: [],
    status: null,
  };
};
