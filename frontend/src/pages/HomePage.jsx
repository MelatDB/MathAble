import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

const TOPICS = [
  { icon: "∑", label: "Algebra",      desc: "Equations, expressions, graphs.", sub: "Equations · Expressions · Graphs" },
  { icon: "∫", label: "Calculus",     desc: "Change, rates, accumulation.",    sub: "Limits · Derivatives · Integrals" },
  { icon: "√", label: "Roots",        desc: "Square roots, radicals, powers.", sub: "Square roots · Radicals · Powers" },
  { icon: "△", label: "Trigonometry", desc: "Triangles, angles, identities.",  sub: "Sine · Cosine · Identities" },
];

export default function HomePage() {
  const { user } = useAuth();
  const { announce } = useAnnouncement();

  usePageAnnouncement(
    user
      ? "Dashboard. Use the navigation to Solve Math, Practice, view Progress, or adjust Settings."
      : "Welcome to MathAble. Accessible mathematics for everyone."
  );
  useVoiceGuide({
    intro: user
      ? `Welcome back, ${user.name}. You are on the MathAble Dashboard.`
      : "Welcome to MathAble. Accessible mathematics for everyone.",
    actions: user
      ? "Say: Solver, Practice, Progress, Settings, Help, or Solutions."
      : "Say: Log In, or Get Started to create a new account.",
  });

  if (user?.role === "teacher") return <Navigate to="/teacher" replace />;

  /* ── Logged-in dashboard ── */
  if (user) {
    return (
      <div>
        <section aria-labelledby="dash-heading" style={{ marginBottom: "2rem" }}>
          <span className="section-label">Your Learning Space</span>
          <h1 id="dash-heading" style={{ marginBottom: "0.25rem" }}>
            Welcome back, {user.name}
          </h1>
          <p style={{ marginBottom: "1.5rem" }}>A calm place to work through the next problem at your own pace.</p>

          {/* Practice snapshot */}
          <div className="snapshot-card">
            <div className="snapshot-text">
              <p className="snapshot-title">Your practice snapshot</p>
              <p className="snapshot-message">Small steps add up. Choose a topic and keep going.</p>
            </div>
            <div className="snapshot-accuracy">
              <div className="accuracy-ring" aria-label="Accuracy">—</div>
              <span className="accuracy-label">Accuracy<br />across practice</span>
            </div>
          </div>

          {/* Action cards */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div className="section-header-row">
              <h2 style={{ margin: 0, fontSize: "1rem" }}>Choose your next step</h2>
            </div>
            <div className="page-grid page-grid-2" style={{ maxWidth: "720px" }}>
              <Link to="/solve" className="action-card" aria-describedby="solve-desc">
                <span className="action-icon" aria-hidden="true">∑</span>
                <h3>Solve Math</h3>
                <p id="solve-desc">Work through a problem step by step with accessible, read-aloud explanations.</p>
                <span className="action-link">Open solver →</span>
              </Link>
              <Link to="/practice" className="action-card" aria-describedby="practice-desc"
                onClick={() => announce("Opening Practice.")}>
                <span className="action-icon" aria-hidden="true">📖</span>
                <h3>Practice</h3>
                <p id="practice-desc">Select a topic, choose your pace, and get helpful feedback along the way.</p>
                <span className="action-link">Choose a practice question →</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ── Guest landing page ── */
  return (
    <div>
      {/* Hero */}
      <div className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-content">
          <span className="section-label">MathAble · Inclusive Mathematics</span>
          <h1 id="hero-heading" style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)", marginBottom: "1rem" }}>
            Making Mathematics<br />More Accessible
          </h1>
          <p style={{ fontSize: "1rem", maxWidth: "44ch", marginBottom: "1.75rem" }}>
            A clearer way to work through mathematics, one thoughtfully explained step at a time.
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: "1rem" }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started →
            </Link>
            <Link to="/help" className="btn btn-secondary btn-lg">
              Explore dashboard
            </Link>
          </div>
          <p className="a11y-note">
            <span aria-hidden="true">🔊</span>
            Compatible with screen readers and keyboard navigation
          </p>
        </div>
      </div>

      {/* Topic cards */}
      <section aria-labelledby="topics-heading" style={{ marginTop: "2.5rem" }}>
        <div className="section-header-row">
          <h2 id="topics-heading" style={{ margin: 0, fontSize: "1.1rem" }}>Explore mathematics</h2>
          <Link to="/practice" className="section-header-link">Explore practice →</Link>
        </div>
        <ul
          style={{ listStyle: "none", padding: 0, margin: 0,
                   display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}
          aria-label="Supported mathematics topics"
        >
          {TOPICS.map((t) => (
            <li key={t.label} className="feature-card">
              <div className="feature-card-icon" aria-hidden="true"
                style={{ fontSize: "1.2rem", width: 44, height: 44 }}>
                {t.icon}
              </div>
              <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.95rem", color: "var(--color-text)" }}>
                {t.label}
              </h3>
              <p style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>{t.desc}</p>
              <p style={{ fontSize: "0.75rem", margin: 0, color: "var(--color-text-dim)" }}>{t.sub}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
