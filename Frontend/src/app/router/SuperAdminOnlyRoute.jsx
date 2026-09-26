import { Navigate } from "react-router-dom";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import { Spinner } from "../../shared/components/Spinner.jsx";

// Manager/Sub-Admin RBAC — frontend-only convenience guard for superadmin
// pages (e.g. Manager Management). This is strictly a UX nicety: the real
// authorization boundary is requireRole("superadmin") on the backend
// routes, which a manager cannot bypass even by calling the API directly.
export const SuperAdminOnlyRoute = ({ children }) => {
  const { admin, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-graphite-950">
        <Spinner size={32} className="text-brass" />
      </div>
    );
  }

  if (admin?.role !== "superadmin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};
