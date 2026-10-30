import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { adminSession, managerSession } from "../../services/api/client.js";
import {
  loginSuperadmin as apiLoginSuperadmin,
  loginManager as apiLoginManager,
  logoutAdmin as apiLogoutAdmin,
  logoutManager as apiLogoutManager,
  registerAdmin as apiRegister,
  refreshSession as apiRefreshAdminSession,
  refreshManagerSession as apiRefreshManagerSession,
  fetchMe as apiFetchAdminMe,
  fetchManagerMe as apiFetchManagerMe,
} from "../../services/auth/authApi.js";

const AuthContext = createContext(null);

export const dashboardPathForRole = (role) =>
  role === "manager" ? "/manager/dashboard" : "/admin/dashboard";

export const loginPathForRole = (role) =>
  role === "manager" ? "/manager/login" : "/admin/login";

// Stable per-role API bundles (module-level so hooks don't re-run).
const SUPERADMIN_API = {
  login: apiLoginSuperadmin,
  logout: apiLogoutAdmin,
  refresh: apiRefreshAdminSession,
  me: apiFetchAdminMe,
};
const MANAGER_API = {
  login: apiLoginManager,
  logout: apiLogoutManager,
  refresh: apiRefreshManagerSession,
  me: apiFetchManagerMe,
};

// ─── One independent session ─────────────────────────────────────────────────
// Owns a single role's auth state: its profile, its status, and its login /
// logout actions. Two instances run side by side (superadmin + manager) and
// never share state — logging out, expiring, or refreshing one cannot affect
// the other. Each listens only to its own session client's logout event.
const useRoleSession = ({ session, api }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");
  // Guards against concurrent bootstraps (e.g. React StrictMode double
  // effects in dev): a second bootstrap awaits the in-flight one instead
  // of firing a duplicate refresh, which would look like token reuse and
  // revoke the session on the backend.
  const bootstrapPromise = useRef(null);

  const bootstrap = useCallback(async () => {
    if (!bootstrapPromise.current) {
      bootstrapPromise.current = (async () => {
        try {
          await api.refresh();
          const me = await api.me();
          setUser(me);
          setStatus("authenticated");
        } catch {
          session.clearAccessToken();
          setUser(null);
          setStatus("guest");
        } finally {
          bootstrapPromise.current = null;
        }
      })();
    }
    return bootstrapPromise.current;
  }, [session, api]);

  useEffect(() => {
    bootstrap();
    const handleForcedLogout = () => {
      setUser(null);
      setStatus("guest");
    };
    window.addEventListener(session.logoutEvent, handleForcedLogout);
    return () =>
      window.removeEventListener(session.logoutEvent, handleForcedLogout);
  }, [bootstrap, session]);

  const login = useCallback(
    async (credentials) => {
      const me = await api.login(credentials);
      setUser(me);
      setStatus("authenticated");
      return me;
    },
    [api],
  );

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setStatus("guest");
  }, [api]);

  // Used when a session is established outside login() (one-time admin
  // registration) so the state stays in sync with the client's token.
  const syncUser = useCallback((me) => {
    setUser(me);
    setStatus(me ? "authenticated" : "guest");
  }, []);

  return useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      isChecking: status === "checking",
      login,
      logout,
      syncUser,
    }),
    [user, status, login, logout, syncUser],
  );
};

export const AuthProvider = ({ children }) => {
  const superadmin = useRoleSession({
    session: adminSession,
    api: SUPERADMIN_API,
  });
  const manager = useRoleSession({
    session: managerSession,
    api: MANAGER_API,
  });

  const value = useMemo(
    () => ({ superadmin, manager }),
    [superadmin, manager],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

// ─── Direct per-role hooks ───────────────────────────────────────────────────
// Prefer these in new code: they make it explicit which session you need.
export const useAdminAuth = () => useAuthContext().superadmin;
export const useManagerAuth = () => useAuthContext().manager;

// ─── Backward-compatible hook ────────────────────────────────────────────────
// Returns the session for the current area, so every existing call site
// (layouts, pages, RoleRoute, GuestOnlyRoute) keeps working unchanged:
//   - under /manager/* → the manager session
//   - everywhere else   → the superadmin session
export const useAuth = () => {
  const ctx = useAuthContext();
  const isManagerArea =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/manager/");
  const session = isManagerArea ? ctx.manager : ctx.superadmin;

  const loginAs = useCallback(
    async (role, credentials) => {
      const target = role === "manager" ? ctx.manager : ctx.superadmin;
      return target.login(credentials);
    },
    [ctx],
  );

  const register = useCallback(
    async (payload) => {
      const me = await apiRegister(payload);
      ctx.superadmin.syncUser(me);
      return me;
    },
    [ctx],
  );

  return useMemo(
    () => ({
      admin: session.user,
      status: session.status,
      isAuthenticated: session.isAuthenticated,
      isChecking: session.isChecking,
      // Role-specific login. The backend enforces the role and issues no
      // tokens on a role mismatch, so a manager cannot use the admin login
      // (or vice versa) even with a correct password.
      loginAs,
      loginSuperadmin: ctx.superadmin.login,
      loginManager: ctx.manager.login,
      // Legacy login() kept for existing callers: it is now superadmin-only.
      login: ctx.superadmin.login,
      register,
      logout: session.logout,
      dashboardPath: dashboardPathForRole(session.user?.role),
      // Escape hatches for components that genuinely need both sessions.
      superadminSession: ctx.superadmin,
      managerSession: ctx.manager,
    }),
    [ctx, session, loginAs, register],
  );
};
