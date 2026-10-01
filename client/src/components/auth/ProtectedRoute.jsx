import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Frontend routing convenience only. The real enforcement is
 * requireAuth/requireRole on the backend — never rely on this alone.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper-off text-text-muted">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/staff"} replace />;
  }

  return children;
}
