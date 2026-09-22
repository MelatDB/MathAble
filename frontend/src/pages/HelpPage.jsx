import { Link } from "react-router-dom";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

const SHORTCUTS = [
  { label: "Navigation Hub",      key: "Alt+1" },
  { label: "Math Input Workspace", key: "Alt+A" },
  { label: "Solve Problem (Submit)", key: "Alt+S" },
  { label: "Submit and Verify Equation", key: "Enter" },
];

export default function HelpPage() {
  usePageAnnouncement(
    "Help page. Keyboard shortcuts, how to use the Math Solver and Practice, and accessibility guide."
  );

  useVoiceGuide({
    intro:
      "Help page. This page explains how to use MathAble with your voice, keyboard, or screen reader.",
    actions:
      "MathAble has three navigation modes: Voice Navigation, Keyboard Navigation, and Voice plus Keyboard. " +
      "You can change the mode on the Settings page at any time. " +
      "In Voice Navigation mode, you can say commands like: Solver, Practice, Progress, Settings, Back, or Home. " +
      "On the Math Solver page say: Read Solution, to hear the answer, or: Read Question, to hear the problem again. " +
      "On the Practice page say: Read Question, Submit, Next, or Read Explanation. " +
      "For keyboard navigation, use Tab and Shift Tab to move between controls, Enter to activate buttons, and Escape to cancel. " +
      "Every page begins by speaking its name and available actions when voice navigation is active. " +
      "To go to the Math Solver, say: Solver. " +
      "To start practising, say: Practice. " +
      "To go back, say: Back.",
  });
  return (
    <div>
      <div className="context-banner" role="note">
        This Index is Interactive User Document (ARIA &amp; Keyboard Shortcut) Manual Active
      </div>

      <div className="page-grid page-grid-sidebar" style={{ marginTop: "1.5rem", gap: "2rem" }}>
        {/* ── Left: guide content ── */}
        <section aria-labelledby="help-heading">
          <span className="section-label">System Reference</span>
          <h1 id="help-heading">MathAble Accessibility Guide</h1>

          {/* Section 1 */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>1. Plaintext &amp; LaTeX Mathematical Notations</h2>
            <p>
              Students using standard keyboard inputs to Braille displays can type mathematical expressions into the
              token using any of the following plaintext formats. Our AI engine translates them immediately into speech
              variations.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", marginTop: "0.75rem" }}>
              {[
                { label: "Fractions",   example: "Type a / b or rac{a}{b}" },
                { label: "Integrals",   example: "Type integrate x^2 from 0 to 5" },
                { label: "Logarithms",  example: "Type log_base_number()" },
              ].map(({ label, example }) => (
                <div key={label}>
                  <span style={{ color: "var(--color-text)", fontWeight: 600, fontSize: "0.9rem" }}>{label}</span>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                    {example}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>2. Troubleshooting Screen Reader Desynchronisations</h2>
            <p>
              If the speech synthesiser conflicts with your JAWS or NVDA screen reader, we recommend pressing [Alt+R]
              to toggle local visual accessibility mode or adjusting narration velocity.
            </p>
          </div>

          {/* Section 3 — keyboard */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>3. Keyboard Navigation</h2>
            <ul style={{ margin: 0, padding: "0 0 0 1.25rem" }}>
              <li style={{ marginBottom: "0.4rem" }}>
                <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> — move between interactive elements
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                <kbd>Enter</kbd> / <kbd>Space</kbd> — activate buttons and links
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                <kbd>Escape</kbd> — close dialogs or cancel voice input
              </li>
              <li>
                The first focusable item on every page is a <em>Skip to main content</em> link —
                press <kbd>Tab</kbd> once to reveal it.
              </li>
            </ul>
          </div>

          {/* Section 4 — pages */}
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>4. Page Guide</h2>
            <ul style={{ margin: 0, padding: "0 0 0 1.25rem" }}>
              <li style={{ marginBottom: "0.4rem" }}>
                <Link to="/solve">Solve Math</Link> — Enter any expression, receive step-by-step audio narration
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                <Link to="/practice">Practice</Link> — Topic-based sessions with instant feedback
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                <Link to="/progress">Progress</Link> — Accuracy tracking and competency breakdown
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                <Link to="/settings">Settings</Link> — Contrast, font size, TTS voice and rate
              </li>
              <li>
                <Link to="/story">My Solutions</Link> — History of all solved problems
              </li>
            </ul>
          </div>
        </section>

        {/* ── Right: shortcuts panel ── */}
        <aside>
          <div className="card card-active" style={{ marginBottom: "1.5rem" }}>
            <span className="section-label">System-Wide Keyboard Shortcuts</span>
            <div style={{ marginTop: "0.5rem" }}>
              {SHORTCUTS.map(({ label, key }) => (
                <div key={label} className="kbd-row">
                  <span className="kbd-row-label">{label}</span>
                  <kbd>{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Need Personalised Assist?</h2>
            <p style={{ fontSize: "0.875rem" }}>
              Our technicians manually review base-consideration client profiles and direct adjustments for minor
              optimisations to physical keyboard configurations.
            </p>
            <a
              href="mailto:accessibility@school.edu"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              Email accessibility@school.edu
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
