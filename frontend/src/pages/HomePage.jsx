import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

const TOPICS = [
  { icon: "∑", label: "Algebra & Matrices",     desc: "Linear equations, operations, eigenvalues." },
  { icon: "㏒", label: "Roots & Logarithms",     desc: "Exponents, base powers, natural logs." },
  { icon: "∫", label: "Calculus & Integration",  desc: "Limits, derivatives, definite integrals." },
  { icon: "△", label: "Trigonometry",            desc: "Identities, sine/cosine, geometry." },
];

export default function HomePage() {
  const { user } = useAuth();
  const { announce } = useAnnouncement();

  usePageAnnouncement(
    user
      ? "Dashboard. Use the navigation to Solve Math, Practice, view Progress, or adjust Settings."
      : "Welcome to MathAble. Accessible mathematics for everyone. Create a free account or log in to get started."
  );

  useVoiceGuide({
    intro: user
      ? `Welcome back, ${user.name}. You are on the MathAble Dashboard.`
      : "Welcome to MathAble. Accessible mathematics for everyone.",
    actions: user
      ? "You can say: Solver, to go to the Math Solver. " +
        "Practice, to start a practice session. " +
        "Progress, to see your learning progress. " +
        "Settings, to change accessibility options. " +
        "Help, to hear how to use MathAble. " +
        "Solutions, to see your recent solved problems."
      : "To get started, say: Log In, or Get Started to create a new account. " +
        "Say Help to learn more about MathAble.",
  });

  if (user?.role === "teacher") return <Navigate to="/teacher" replace />;

  return (
    <div>
      {/* Context banner */}
      <div className="context-banner" role="note" aria-label="Keyboard shortcut tip">
        Press Tab/Shift-Tab to navigate to main page controls or login
      </div>

      {/* Hero section */}
      <section
        aria-labelledby="hero-heading"
        style={{ padding: "3rem 0 2.5rem", display: "grid", gap: "2rem" }}
        className="page-grid page-grid-sidebar"
      >
        {/* Left: copy */}
        <div>
          <span className="section-label">University-accessible STEM platform</span>
          <h1 id="hero-heading" style={{ fontSize: "clamp(2rem,5vw,3rem)", marginBottom: "1rem" }}>
            Making Mathematics<br />More Accessible
          </h1>
          <p style={{ fontSize: "1rem", maxWidth: "44ch", marginBottom: "1.5rem" }}>
            Empowering blind and visually impaired university students to independently write,
            calculate, and study complex higher-level equations with tactile, verbal, and
            screen-reader optimisations.
          </p>

          <div className="flex flex-wrap gap-2">
            {user ? (
              <Link
                to="/solve"
                className="btn btn-primary btn-lg"
                onClick={() => announce("Opening the math solver.")}
              >
                Go to Solver
                <span className="sr-only">(keyboard shortcut Alt+S)</span>
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started For Free
                  <kbd style={{ fontSize: "0.7rem", background: "rgba(0,0,0,0.2)", border: "none", color: "inherit", padding: "0.1em 0.35em", borderRadius: "3px" }}>Enter</kbd>
                </Link>
                <Link to="/help" className="btn btn-secondary btn-lg">
                  Listen Overview Video
                  <kbd style={{ fontSize: "0.7rem" }}>Alt</kbd>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right: preview card */}
        <div
          className="card"
          aria-label="Tactile and audio search preview"
          style={{ background: "var(--color-surface)", padding: "1.5rem" }}
        >
          <span className="section-label">Tactile &amp; Audio Search Preview</span>

          {/* Braille dots decoration */}
          <div aria-hidden="true" style={{ display: "flex", gap: "0.35rem", margin: "0.75rem 0" }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: i < 9 ? "var(--color-primary)" : "var(--color-info)",
                  display: "inline-block",
                }}
              />
            ))}
          </div>

          <div
            className="math-container"
            style={{ marginBottom: "0.75rem", fontSize: "1.1rem" }}
            aria-label="Example expression: f of x equals sine of x"
          >
            <code className="font-mono" style={{ background: "none", border: "none", color: "var(--color-text)", fontSize: "1.1rem", padding: 0 }}>
              f(x) = \sin(x)
            </code>
            <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
              <button className="audio-btn btn-sm" type="button" aria-label="Read aloud">
                🔊 Read Aloud
              </button>
            </div>
          </div>

          <div
            className="step-audio-row"
            aria-live="polite"
            aria-label="Audio narration preview"
          >
            <span className="step-audio-icon" aria-hidden="true">🔊</span>
            <span style={{ fontStyle: "italic", fontSize: "0.85rem" }}>
              Audio Narration: "This function is a sine of x"
            </span>
          </div>
        </div>
      </section>

      {/* Curriculum section */}
      <section aria-labelledby="curriculum-heading" style={{ paddingTop: "2rem" }}>
        <span className="section-label">Supported Curriculum</span>
        <h2 id="curriculum-heading" style={{ fontSize: "clamp(1.4rem, 3vw, 1.85rem)", marginTop: 0, marginBottom: "0.5rem" }}>
          Fully compatible with university-level mathematics
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Every topic includes fully validated teach-out paths, clear narration paths, and
          interactive step solving.
        </p>

        <ul
          className="card-list page-grid-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
          aria-label="Supported mathematics topics"
        >
          {TOPICS.map((t) => (
            <li key={t.label} className="feature-card">
              <div className="feature-card-icon" aria-hidden="true">{t.icon}</div>
              <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem" }}>{t.label}</h3>
              <p style={{ fontSize: "0.82rem", margin: 0 }}>{t.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA for logged-in users */}
      {user && (
        <section
          aria-labelledby="actions-heading"
          style={{ marginTop: "2rem" }}
        >
          <h2 id="actions-heading" style={{ marginTop: 0 }}>Primary Actions</h2>
          <div className="page-grid page-grid-2" style={{ maxWidth: "720px" }}>
            <Link
              to="/solve"
              className="feature-card"
              style={{ textDecoration: "none", display: "block" }}
              aria-describedby="solve-desc"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span className="feature-card-icon" style={{ margin: 0 }}>∑</span>
                <span className="btn btn-sm" style={{ pointerEvents: "none", background: "var(--color-primary)", color: "var(--color-primary-text)", border: "none" }}>Press S</span>
              </div>
              <h3 style={{ margin: "0.5rem 0 0.25rem", color: "var(--color-text)" }}>Solve Math Expression</h3>
              <p id="solve-desc" style={{ fontSize: "0.85rem", margin: 0 }}>
                Type equations or use voice dictation to get step-by-step solutions.
              </p>
            </Link>
            <Link
              to="/practice"
              className="feature-card"
              style={{ textDecoration: "none", display: "block" }}
              aria-describedby="practice-desc"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span className="feature-card-icon" style={{ margin: 0 }}>📋</span>
                <span className="btn btn-sm" style={{ pointerEvents: "none", background: "var(--color-info-bg)", color: "var(--color-info-text)", border: "1px solid var(--color-info)" }}>Press P</span>
              </div>
              <h3 style={{ margin: "0.5rem 0 0.25rem", color: "var(--color-text)" }}>Practice Assignments</h3>
              <p id="practice-desc" style={{ fontSize: "0.85rem", margin: 0 }}>
                Complete assigned math sets with automated answer checking.
              </p>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
