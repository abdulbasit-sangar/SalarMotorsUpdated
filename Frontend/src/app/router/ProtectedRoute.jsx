import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import { Spinner } from "../../shared/components/Spinner.jsx";

// Backward-compatible wrapper. New code should use RoleRoute with an
// explicit allowedRoles list and loginPath. Default loginPath is kept
// as /admin/login so existing callers do not break.
export const ProtectedRoute = ({ children, loginPath = "/admin/login" }) => {
  const { isAuthenticated, isChecking } = useAuth();
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

  return children;
};
