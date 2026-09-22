/**
 * ProtectedRoute — blocks access based on authentication and role.
 *
 * Props:
 *   requireAuth  — redirect to /login if not authenticated (default: true)
 *   requireRole  — "student" | "teacher" — redirect with 403 message if role doesn't match
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute({ children, requireAuth = true, requireRole = null }) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return null; // wait for token restore

  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user && user.role !== requireRole) {
    // Wrong role — show an accessible denied message instead of a blank page
    return (
      <section aria-labelledby="denied-heading" style={{ padding: "2rem" }}>
        <h1 id="denied-heading">Access Denied</h1>
        <p>
          This page is only available to{" "}
          <strong>{requireRole === "teacher" ? "teachers" : "students"}</strong>.
        </p>
        <p>You are currently signed in as a <strong>{user.role}</strong>.</p>
        <a href="#/" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Go to Dashboard
        </a>
      </section>
    );
  }

  return children;
}
