/**
 * FirstRunModal — shown once to new users.
 *
 * Introduces the three navigation modes, reads the welcome message aloud,
 * and lets the user pick their preferred mode before dismissing.
 * The preference is saved to localStorage via NavigationContext.
 */
import { useEffect, useRef } from "react";
import { useNavigation, NAV_MODES } from "./NavigationContext";

const MODES = [
  {
    value: NAV_MODES.VOICE,
    label: "Voice Navigation",
    desc: "Navigate entirely by speaking commands like 'Open Practice' or 'Read solution'.",
    badge: "Default",
  },
  {
    value: NAV_MODES.KEYBOARD,
    label: "Keyboard Navigation",
    desc: "Use Tab, Enter, Arrow keys and keyboard shortcuts throughout the app.",
    badge: null,
  },
  {
    value: NAV_MODES.COMBINED,
    label: "Voice + Keyboard",
    desc: "Use both freely — speak a destination, then type an answer, or vice versa.",
    badge: null,
  },
];

const WELCOME_MESSAGE =
  "Welcome to MathAble. " +
  "MathAble supports Voice Navigation, Keyboard Navigation, and combined Voice and Keyboard Navigation. " +
  "Voice Navigation is currently selected as the default. " +
  "Please choose your preferred navigation mode and press Confirm, or press Enter on the selected option. " +
  "You can change this at any time in Accessibility Settings.";

export function FirstRunModal() {
  const { navMode, setNavMode, dismissFirstRun } = useNavigation();
  const confirmBtnRef = useRef(null);

  // Speak welcome message and move focus to dialog on mount
  useEffect(() => {
    confirmBtnRef.current?.focus();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(WELCOME_MESSAGE);
      u.lang = "en-US";
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }

    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const confirm = () => {
    if ("speechSynthesis" in window) {
      const label = MODES.find((m) => m.value === navMode)?.label ?? navMode;
      const u = new SpeechSynthesisUtterance(`${label} selected. Welcome to MathAble.`);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    }
    dismissFirstRun();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
      aria-describedby="first-run-desc"
      style={{
        position: "fixed", inset: 0, zIndex: 9800,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.8)",
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{ maxWidth: "520px", width: "100%", padding: "2rem" }}
      >
        <span className="section-label">Welcome</span>
        <h1 id="first-run-title" style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>
          Welcome to MathAble
        </h1>
        <p id="first-run-desc" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          MathAble supports three navigation modes. Choose the one that works best for you.
          You can change this at any time in Accessibility Settings.
        </p>

        <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem" }}>
          <legend className="sr-only">Select navigation mode</legend>
          {MODES.map((m) => (
            <div
              key={m.value}
              className={`card${navMode === m.value ? " card-active" : ""}`}
              style={{ marginBottom: "0.6rem", cursor: "pointer", padding: "0.9rem" }}
              onClick={() => setNavMode(m.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNavMode(m.value); } }}
              tabIndex={0}
              role="radio"
              aria-checked={navMode === m.value}
              aria-label={`${m.label}${m.badge ? ", " + m.badge : ""}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{m.label}</span>
                {m.badge && (
                  <span
                    className="btn btn-sm"
                    style={{ pointerEvents: "none", padding: "0.1rem 0.5rem", fontSize: "0.7rem", background: "var(--color-primary)", color: "var(--color-primary-text)", border: "none" }}
                  >
                    {m.badge}
                  </span>
                )}
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>{m.desc}</p>
            </div>
          ))}
        </fieldset>

        <button
          ref={confirmBtnRef}
          type="button"
          className="btn btn-primary w-full btn-lg"
          style={{ maxWidth: "100%" }}
          onClick={confirm}
        >
          Confirm — use {MODES.find((m) => m.value === navMode)?.label}
        </button>
      </div>
    </div>
  );
}
