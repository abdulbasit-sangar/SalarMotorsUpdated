import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  loginAdmin as apiLogin,
  logoutAdmin as apiLogout,
  registerAdmin as apiRegister,
  refreshSession,
  fetchMe,
} from "../../services/auth/authApi.js";

const AuthContext = createContext(null);

// Auth bootstrap goes through three states while the app decides whether
// there's a valid session: "checking" -> "authenticated" | "guest".
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

    // Fired by the API client when a refresh attempt fails mid-session.
    const handleForcedLogout = () => {
      setAdmin(null);
      setStatus("guest");
    };
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [bootstrap]);

  const login = useCallback(async (credentials) => {
    const me = await apiLogin(credentials);
    setAdmin(me);
    setStatus("authenticated");
    return me;
  }, []);

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
      status, // "checking" | "authenticated" | "guest"
      isAuthenticated: status === "authenticated",
      isChecking: status === "checking",
      login,
      register,
      logout,
    }),
    [admin, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
