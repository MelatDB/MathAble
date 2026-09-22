import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useTTS } from "../hooks/useTTS";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

export default function StoryPage() {
  usePageAnnouncement("My Solutions page. Your complete history of solved problems with spoken descriptions.");
  useVoiceGuide({
    intro:
      "My Solutions page. Every problem you have solved is listed here, " +
      "with the answer and a spoken description of each result.",
    actions:
      "Each problem shows the expression you entered, how it was interpreted, the answer, and the spoken form of the answer. " +
      "Press the Read button next to any problem to hear its answer aloud. " +
      "To solve a new problem, say: Solver. " +
      "To go back to the dashboard, say: Home.",
  });
  const { user, token }  = useAuth();
  const { settings }     = useAccessibility();
  const { speak, speaking, stop } = useTTS();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get("/problems/history")
      .then((data) => setHistory(data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div className="context-banner" role="note">
        My Solutions — your complete solver history
      </div>

      <section aria-labelledby="story-heading" style={{ marginTop: "1.5rem" }}>
        <span className="section-label">Solution History</span>
        <h1 id="story-heading">Your Recent Solutions</h1>
        <p>Every problem you solved is saved here with the full spoken description.</p>

        {!user && (
          <div className="alert alert-info" role="status" style={{ marginBottom: "1rem" }}>
            <span className="alert-icon" aria-hidden="true">ℹ</span>
            <span>
              <Link to="/login">Log in</Link> to see the problems you have solved.
            </span>
          </div>
        )}

        {loading && <p aria-busy="true" aria-live="polite" style={{ color: "var(--color-text-muted)" }}>Loading your history…</p>}

        {!loading && history.length === 0 && user && (
          <div className="alert alert-info" role="status">
            <span className="alert-icon" aria-hidden="true">ℹ</span>
            <span>
              You haven't solved any problems yet.{" "}
              <Link to="/solve">Go to the solver</Link> to get started.
            </span>
          </div>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} className="card" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <code style={{ fontSize: "1rem", background: "none", border: "none", padding: 0, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>
                      {item.input}
                    </code>
                    <span style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 700, textTransform: "uppercase" }}>
                      {item.expression_type}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem" }}>
                    Interpreted: <code style={{ background: "none", border: "none", padding: 0, color: "var(--color-text-muted)" }}>{item.interpreted}</code>
                  </p>
                  <p style={{ margin: "0 0 0.25rem" }}>
                    Answer: <strong style={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>{item.answer}</strong>
                  </p>
                  <div className="step-audio-row">
                    <span className="step-audio-icon" aria-hidden="true">🔊</span>
                    <em style={{ fontSize: "0.82rem" }}>{item.answer_spoken}</em>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                  </span>
                  {settings.tts_enabled && (
                    <button
                      type="button"
                      className="audio-btn btn-sm"
                      onClick={() => speak(item.answer_spoken)}
                      disabled={speaking}
                      aria-label={`Read answer for ${item.input} aloud`}
                    >
                      🔊 Read
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
