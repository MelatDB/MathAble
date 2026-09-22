import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAuth } from "../auth/AuthContext";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

export default function RegisterPage() {
  usePageAnnouncement(
    "Create account page. Select your account type, enter your name, email and password, then press Create Account."
  );
  useVoiceGuide({
    intro: "Create Account page. Fill in your name, email address, and a password to join MathAble.",
    actions:
      "First choose your account type: Student or Teacher. " +
      "Then fill in your name, email address, and password of at least eight characters. " +
      "Press Enter or the Create Account button when done. " +
      "If you already have an account, say: Log In.",
  });
  const { register } = useAuth();
  const { announce }  = useAnnouncement();
  const navigate      = useNavigate();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("student");
  const [teacherKey, setTeacherKey] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const headers = role === "teacher" && teacherKey
        ? { "X-Teacher-Key": teacherKey }
        : {};
      await register(name, email, password, role, headers);
      announce(`Your ${role} account was created successfully. You are now logged in.`);
      navigate(role === "teacher" ? "/teacher" : "/");
    } catch (exc) {
      const msg = exc.detail || "We could not create your account. Please try again.";
      setError(msg);
      announce(msg, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem 1rem" }}>
      <section
        aria-labelledby="register-heading"
        style={{ width: "100%", maxWidth: "480px" }}
      >
        <div className="card" style={{ padding: "2rem" }}>
          <h1 id="register-heading" style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>
            Create your MathAble account
          </h1>
          <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Your name and email are only used to keep your progress safe.
            Password must be at least 8 characters.
          </p>

          <form onSubmit={onSubmit} noValidate>
            {/* Role selector */}
            <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.25rem" }}>
              <legend className="field-label" style={{ marginBottom: "0.5rem" }}>Account type</legend>
              <div className="flex gap-1">
                {["student", "teacher"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    onClick={() => setRole(r)}
                    className={`btn btn-sm${role === r ? " btn-primary" : " btn-secondary"}`}
                  >
                    {r === "student" ? "Student" : "Teacher"}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Teacher registration key — only shown when teacher role selected */}
            {role === "teacher" && (
              <div className="field">
                <label htmlFor="reg-teacher-key" className="field-label">
                  Teacher registration key
                </label>
                <input
                  id="reg-teacher-key"
                  type="password"
                  className="w-full"
                  placeholder="Provided by your institution"
                  value={teacherKey}
                  onChange={(e) => setTeacherKey(e.target.value)}
                  aria-describedby="teacher-key-hint"
                />
                <span id="teacher-key-hint" style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block", marginTop: "0.2rem" }}>
                  Required to create a teacher account. Contact your admin if you don't have one.
                </span>
              </div>
            )}
            <div className="field">
              <label htmlFor="reg-name" className="field-label">Your name</label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                className="w-full"
                placeholder="Marcus Student"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="reg-email" className="field-label">Email address</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                className="w-full"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
              />
            </div>

            <div className="field">
              <label htmlFor="reg-password" className="field-label">Password</label>
              <div style={{ position: "relative", maxWidth: "36rem" }}>
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  className="w-full"
                  style={{ paddingRight: "6rem" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="pw-hint"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-pressed={showPw}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: "0.5rem", top: "50%",
                    transform: "translateY(-50%)",
                    background: "var(--color-primary)", color: "var(--color-primary-text)",
                    border: "none", borderRadius: "var(--radius-sm)",
                    padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {showPw ? "HIDE" : "SHOW"}
                </button>
              </div>
              <span id="pw-hint" style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block", marginTop: "0.2rem" }}>
                Minimum 8 characters.
              </span>
            </div>

            {error && (
              <div
                className="alert alert-error"
                role="alert"
                aria-live="assertive"
                style={{ marginBottom: "1rem" }}
              >
                <span className="alert-icon" aria-hidden="true">⚠</span>
                <div className="alert-content">
                  <p className="alert-title" style={{ margin: 0 }}>Registration failed</p>
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={busy}
              aria-busy={busy}
              style={{ maxWidth: "100%", marginTop: "0.25rem" }}
            >
              {busy ? "Creating account…" : "Create Account"}
              {!busy && (
                <kbd style={{ fontSize: "0.7rem", background: "rgba(0,0,0,0.2)", border: "none", color: "inherit", borderRadius: "3px", padding: "0.1em 0.4em" }}>
                  Enter
                </kbd>
              )}
            </button>
          </form>

          <p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
            Already have an account?{" "}
            <Link to="/login">Sign in instead</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
