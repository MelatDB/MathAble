import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { AnnouncementRegion } from "./AnnouncementRegion";
import { SkipLink } from "./SkipLink";

const STUDENT_LINKS = [
  { to: "/",          label: "Dashboard", end: true },
  { to: "/solve",     label: "Solve Math" },
  { to: "/practice",  label: "Practice" },
  { to: "/progress",  label: "Progress" },
  { to: "/story",     label: "My Solutions" },
  { to: "/settings",  label: "Settings" },
  { to: "/help",      label: "Help" },
];

const TEACHER_LINKS = [
  { to: "/teacher",              label: "Dashboard", end: true },
  { to: "/teacher/students",     label: "Students" },
  { to: "/teacher/assignments",  label: "Assignments" },
  { to: "/settings",             label: "Settings" },
  { to: "/help",                 label: "Help" },
];

const GUEST_LINKS = [
  { to: "/",     label: "Home", end: true },
  { to: "/help", label: "Help" },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { announce } = useAnnouncement();

  const handleLogout = () => {
    const name = user?.name || "user";
    logout();
    announce(`You have been logged out. Goodbye, ${name}.`);
  };

  const links = !user
    ? GUEST_LINKS
    : user.role === "teacher"
    ? TEACHER_LINKS
    : STUDENT_LINKS;

  const initials = user
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const roleLabel = user?.role === "teacher" ? "Teacher" : user?.role === "student" ? "Student" : null;

  return (
    <div className="app-shell">
      <SkipLink />

      <header className="app-header" role="banner">
        <div className="container">
          {/* Brand */}
          <NavLink
            to={user?.role === "teacher" ? "/teacher" : "/"}
            className="brand"
            aria-label="MathAble — go to dashboard"
          >
            <span className="brand-icon" aria-hidden="true">M+</span>
            <span className="brand-name">MathAble</span>
          </NavLink>

          {/* Role-aware navigation */}
          <nav aria-label="Main navigation">
            <ul className="nav-list" role="list">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      isActive ? "nav-link nav-link-active" : "nav-link"
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2" style={{ marginLeft: "auto", flexShrink: 0 }}>
            <span className="sr-badge" aria-label="Screen reader compatible">
              {roleLabel ? `${roleLabel} · SR Compatible` : "SR Compatible"}
            </span>

            {user ? (
              <button
                className="user-chip"
                type="button"
                onClick={handleLogout}
                aria-label={`Logged in as ${user.name} (${user.role}). Press to log out.`}
              >
                <span className="user-avatar" aria-hidden="true">{initials}</span>
                {user.name}
              </button>
            ) : (
              <div className="flex gap-1">
                <NavLink to="/login"    className="nav-link">Log in</NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm">Get Started</NavLink>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <AnnouncementRegion />

      <footer className="app-footer" role="contentinfo">
        <p style={{ margin: 0 }}>
          MathAble — Universally accessible STEM platform · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
