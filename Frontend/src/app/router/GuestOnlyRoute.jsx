import { Navigate } from "react-router-dom";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import { Spinner } from "../../shared/components/Spinner.jsx";

// Guest-only pages (login, register, pending). If already logged in,
// send the user to THEIR dashboard, not always to /admin/dashboard.
// Previously a manager who was already logged in and visited a login
// page was sent to the admin dashboard, which they should not see.
export const GuestOnlyRoute = ({ children }) => {
  const { admin, isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-graphite-950">
        <Spinner size={32} className="text-brass" />
      </div>
    );
  }

  if (isAuthenticated) {
    const dashboard =
      admin?.role === "manager" ? "/manager/dashboard" : "/admin/dashboard";
    return <Navigate to={dashboard} replace />;
  }

  return children;
};
