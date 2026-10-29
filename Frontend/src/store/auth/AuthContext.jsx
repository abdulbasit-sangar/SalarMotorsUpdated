import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  loginSuperadmin as apiLoginSuperadmin,
  loginManager as apiLoginManager,
  logoutAdmin as apiLogout,
  registerAdmin as apiRegister,
  refreshSession,
  fetchMe,
} from "../../services/auth/authApi.js";

const AuthContext = createContext(null);

export const dashboardPathForRole = (role) =>
  role === "manager" ? "/manager/dashboard" : "/admin/dashboard";

export const loginPathForRole = (role) =>
  role === "manager" ? "/manager/login" : "/admin/login";

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState("checking");

  const bootstrap = useCallback(async () => {
    try {
      await refreshSession();
      const me = await fetchMe();
      setAdmin(me);
      setStatus("authenticated");
    } catch {
      setAdmin(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    bootstrap();
    const handleForcedLogout = () => {
      setAdmin(null);
      setStatus("guest");
    };
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [bootstrap]);

  // Role-specific login. The backend enforces the role and issues no
  // tokens on a role mismatch, so a manager cannot use the admin login
  // (or vice versa) even with a correct password.
  const loginAs = useCallback(async (role, credentials) => {
    const apiLogin = role === "manager" ? apiLoginManager : apiLoginSuperadmin;
    const me = await apiLogin(credentials);
    setAdmin(me);
    setStatus("authenticated");
    return me;
  }, []);

  const loginSuperadmin = useCallback(
    (credentials) => loginAs("superadmin", credentials),
    [loginAs],
  );
  const loginManager = useCallback(
    (credentials) => loginAs("manager", credentials),
    [loginAs],
  );

  // Legacy login() kept for existing callers: it is now superadmin-only.
  const login = loginSuperadmin;

  const register = useCallback(async (payload) => {
    const me = await apiRegister(payload);
    setAdmin(me);
    setStatus("authenticated");
    return me;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setAdmin(null);
    setStatus("guest");
  }, []);

  const value = useMemo(
    () => ({
      admin,
      status,
      isAuthenticated: status === "authenticated",
      isChecking: status === "checking",
      login,
      loginAs,
      loginSuperadmin,
      loginManager,
      register,
      logout,
      dashboardPath: dashboardPathForRole(admin?.role),
    }),
    [admin, status, login, loginAs, loginSuperadmin, loginManager, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
