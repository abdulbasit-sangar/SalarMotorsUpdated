import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import { Spinner } from "../../shared/components/Spinner.jsx";

export const ProtectedRoute = ({ children }) => {
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
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};
