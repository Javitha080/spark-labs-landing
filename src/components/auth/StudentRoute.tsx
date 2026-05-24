import { Navigate, useLocation } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";

/**
 * StudentRoute — Protected route wrapper for student-only pages.
 * - Redirects unauthenticated users to /student/login (preserving return URL)
 * - Forces password change before any other access
 */
export default function StudentRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, mustChangePassword, loading } = useStudentAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to={`/student/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (mustChangePassword && location.pathname !== "/student/change-password") {
    return <Navigate to="/student/change-password" replace />;
  }

  return <>{children}</>;
}
