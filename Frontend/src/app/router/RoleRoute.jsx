import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import { Spinner } from "../../shared/components/Spinner.jsx";

// RoleRoute is a UX guard only — the real authorization boundary is
// verifyJWT + requireRole on the backend, which cannot be bypassed by
// calling the API directly. This guard only keeps the wrong dashboard
// from rendering and sends the user to the correct login page.
//
// Usage:
//   <RoleRoute allowedRoles={["superadmin"]} loginPath="/admin/login">
//     <AdminLayout />
//   </RoleRoute>
//   <RoleRoute allowedRoles={["manager"]} loginPath="/manager/login">
//     <AdminLayout />
//   </RoleRoute>
export const RoleRoute = ({ allowedRoles, loginPath, children }) => {
  const { admin, isAuthenticated, isChecking } = useAuth();
  const location = useLocation();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-graphite-950">
        <Spinner size={32} className="text-brass" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(admin?.role)) {
    // Logged in, but for the other area. Send them to their own
    // dashboard, not to a generic page where they might guess URLs.
    const ownDashboard =
      admin?.role === "manager" ? "/manager/dashboard" : "/admin/dashboard";
    return <Navigate to={ownDashboard} replace />;
  }

  return children;
};

// Convenience wrappers, matching the existing SuperAdminOnlyRoute style.
export const SuperAdminOnlyRoute = ({ children }) => (
  <RoleRoute allowedRoles={["superadmin"]} loginPath="/admin/login">
    {children}
  </RoleRoute>
);

export const ManagerOnlyRoute = ({ children }) => (
  <RoleRoute allowedRoles={["manager"]} loginPath="/manager/login">
    {children}
  </RoleRoute>
);
