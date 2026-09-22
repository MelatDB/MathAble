/**
 * LoginPage — fully voice-operable when voice navigation is active.
 *
 * Voice flow:
 *   Page loads → speaks welcome + instructions
 *   User says "my email is …" → email is filled and confirmed
 *   User says "my password is …" → password is accepted silently (not read back)
 *   User says "sign in" → form is submitted
 *   Keyboard tab/type/enter also works at all times
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAuth } from "../auth/AuthContext";
import { useNavigation } from "../navigation/NavigationContext";
import { useVoiceNav } from "../navigation/VoiceNavProvider";
import { useVoiceGuide } from "../hooks/useVoiceGuide";
import { useVoiceDictation } from "../hooks/useVoiceDictation";

export default function LoginPage() {
  const { login }    = useAuth();
  const { announce } = useAnnouncement();
  const { voiceActive } = useNavigation();
  const { pauseNavForInput, resumeNavAfterInput, navSpeak, registerActions } = useVoiceNav();
  const navigate     = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);
  // Voice flow step: null | "email" | "password" | "confirm"
  const [voiceStep, setVoiceStep] = useState(null);

  useVoiceGuide({
    intro: "Sign In page.",
    actions: voiceActive
      ? "Say: my email is, followed by your email address. " +
        "Then say: my password is, followed by your password. " +
        "Then say: sign in. " +
        "Or say: create account, to register instead."
      : "Enter your email and password, then press Sign In.",
  });

  // Dictation for email field
  const emailDictation = useVoiceDictation({
    onResult: (t) => {
      setEmail(t);
      navSpeak(`Email set to ${t}. Now say: my password is, followed by your password.`);
      setVoiceStep("password");
    },
    onNavPause: pauseNavForInput,
    onNavResume: resumeNavAfterInput,
  });

  // Dictation for password — we accept it but never speak it back
  const passwordDictation = useVoiceDictation({
    onResult: (t) => {
      setPassword(t);
      navSpeak("Password received. Say: sign in, to log in.");
      setVoiceStep("confirm");
    },
    onNavPause: pauseNavForInput,
    onNavResume: resumeNavAfterInput,
  });

  const doSubmit = async () => {
    setError("");
    setBusy(true);
    navSpeak("Signing in. Please wait.");
    try {
      await login(email, password);
      announce("You are now logged in. Welcome back.");
      navigate("/");
    } catch (exc) {
      const msg = exc.detail || "Sign in failed. Please check your email and password.";
      setError(msg);
      announce(msg, true);
      navSpeak(msg + " Say: my email is, to start again.");
      setVoiceStep("email");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e) => { e.preventDefault(); await doSubmit(); };

  // Register voice actions so nav commands work on this page
  useEffect(() => {
    const deregister = registerActions({
      // "sign in" / "submit" triggers the form
      submitAnswer: () => doSubmit(),
      // "my email is …" — handled by SET_ANSWER (repurposed here)
      setAnswer: (v) => {
        // If we're at the email step or haven't started, treat spoken value as email
        if (!email || voiceStep === "email") {
          setEmail(v);
          navSpeak(`Email set to ${v}. Now say: my password is, followed by your password.`);
          setVoiceStep("password");
        } else if (voiceStep === "password") {
          setPassword(v);
          navSpeak("Password received. Say: sign in, to log in.");
          setVoiceStep("confirm");
        }
      },
    });
    return deregister;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, voiceStep]);

  // Voice-guided step trigger: start email dictation automatically when page loads in voice mode
  const startedRef = useRef(false);
  useEffect(() => {
    if (!voiceActive || startedRef.current) return;
    startedRef.current = true;
    const t = setTimeout(() => {
      // After the page guide has finished, prompt for email
      const onEnd = () => {
        navSpeak("Please say: my email is, followed by your email address.");
        setVoiceStep("email");
      };
      if (window.speechSynthesis?.speaking) {
        const check = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(check);
            onEnd();
          }
        }, 300);
      } else {
        onEnd();
      }
    }, 4500); // wait for voice guide to finish
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceActive]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem 1rem" }}>
      <section aria-labelledby="login-heading" style={{ width: "100%", maxWidth: "480px" }}>
        <div className="card" style={{ padding: "2rem" }}>
          <h1 id="login-heading" style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>
            Sign In to MathAble
          </h1>

          {/* Voice guidance panel */}
          {voiceActive && (
            <div
              className="alert alert-info"
              role="status"
              aria-live="polite"
              style={{ marginBottom: "1.25rem" }}
            >
              <span aria-hidden="true">🎤</span>
              <div>
                {!voiceStep && <p style={{ margin: 0 }}>Voice navigation active. Listening for your email.</p>}
                {voiceStep === "email" && (
                  <div>
                    <p style={{ margin: "0 0 0.5rem" }}>Step 1 of 3: Say your email address.</p>
                    <button
                      type="button"
                      className={`voice-btn${emailDictation.listening ? " voice-btn-active" : ""}`}
                      onClick={() => emailDictation.dictate("email address")}
                      disabled={emailDictation.listening}
                    >
                      🎤 {emailDictation.listening ? "Listening…" : "Speak email"}
                    </button>
                  </div>
                )}
                {voiceStep === "password" && (
                  <div>
                    <p style={{ margin: "0 0 0.5rem" }}>Step 2 of 3: Say your password. It will not be read aloud.</p>
                    <button
                      type="button"
                      className={`voice-btn${passwordDictation.listening ? " voice-btn-active" : ""}`}
                      onClick={() => passwordDictation.dictate("password")}
                      disabled={passwordDictation.listening}
                    >
                      🎤 {passwordDictation.listening ? "Listening…" : "Speak password"}
                    </button>
                  </div>
                )}
                {voiceStep === "confirm" && (
                  <div>
                    <p style={{ margin: "0 0 0.5rem" }}>Step 3 of 3: Say "sign in" to log in, or "change password" to redo your password.</p>
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-primary btn-sm" onClick={doSubmit} disabled={busy}>
                        Sign In
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm"
                        onClick={() => { setVoiceStep("password"); navSpeak("Say your password again."); }}>
                        Change Password
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="login-email" className="field-label">Email address</label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="field-label">Password</label>
              <div style={{ position: "relative", maxWidth: "36rem" }}>
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full"
                  style={{ paddingRight: "6rem" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
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
            </div>

            {error && (
              <div className="alert alert-error" role="alert" aria-live="assertive" style={{ marginBottom: "1rem" }}>
                <span aria-hidden="true">⚠</span>
                <div className="alert-content">
                  <p className="alert-title" style={{ margin: 0 }}>Sign in failed</p>
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
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
            Don't have an account?{" "}
            <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
