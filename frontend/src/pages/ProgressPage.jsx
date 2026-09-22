import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAuth } from "../auth/AuthContext";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

const LEVEL_LABELS = { high: "Mastery", mid: "Proficient", low: "Developing" };

function accuracyLevel(acc) {
  if (acc >= 80) return "high";
  if (acc >= 50) return "mid";
  return "low";
}

export default function ProgressPage() {
  usePageAnnouncement("Progress page. Loading your learning statistics.");

  useVoiceGuide({
    intro:
      "Progress page. This page shows how you are doing across all mathematics topics. " +
      "You can see your total attempts, correct answers, and accuracy percentage for each topic.",
    actions:
      "Your overall statistics will be read to you automatically once they load. " +
      "To practise the topic where you need the most improvement, say: Practice. " +
      "To go back to the dashboard, say: Home. " +
      "To solve a new problem, say: Solver.",
  });
  const { user, token } = useAuth();
  const { announce }    = useAnnouncement();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get("/progress")
      .then((data) => {
        setProgress(data);
        const acc = Math.round(data.overall_accuracy);
        const msg =
          `Progress loaded. ${data.total_attempts} total attempt${data.total_attempts !== 1 ? "s" : ""}. ` +
          `Overall accuracy: ${acc} percent. ` +
          (data.topics.length > 0
            ? `Topics practiced: ${data.topics.map((t) => t.topic).join(", ")}.`
            : "No practice sessions yet.");
        announce(msg);
      })
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
  }, [token, announce]);

  return (
    <div>
      <div className="context-banner" role="note">
        This Index is Results and Progress Screen · Shortcuts: [Alt+1] to return to your student practice dashboard
      </div>

      <div className="page-grid page-grid-sidebar" style={{ marginTop: "1.5rem", gap: "2rem" }}>
        {/* ── Left: main stats ── */}
        <section aria-labelledby="progress-heading">
          <span className="section-label">Performance Hub</span>
          <h1 id="progress-heading">Your Learning Dashboard</h1>
          <p>Track accuracy, monitor daily practice trends, and access MathAble interactive report pages.</p>

          {!user && (
            <div className="alert alert-info" role="status">
              <span className="alert-icon" aria-hidden="true">ℹ</span>
              <div>
                <Link to="/login">Log in</Link> to view your saved progress across every topic.
              </div>
            </div>
          )}

          {loading && <p aria-busy="true" aria-live="polite" style={{ color: "var(--color-text-muted)" }}>Loading your progress…</p>}

          {!loading && progress && (
            <>
              {/* Stat cards */}
              <div className="stats-grid" style={{ marginTop: "1rem" }}>
                <div className="stat-card">
                  <div className="stat-value">{progress.total_attempts}</div>
                  <div className="stat-label">Completed Questions</div>
                  <div className="stat-delta">↑ {progress.total_correct} this week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value stat-accent">
                    {Math.round(progress.overall_accuracy)}%
                  </div>
                  <div className="stat-label">Accuracy Score</div>
                  <div className="stat-delta">↑ Mastery-Tier Validated</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{progress.total_incorrect}</div>
                  <div className="stat-label">Total Questions Wrong</div>
                  <div className="stat-delta">📊 Audio Calls</div>
                </div>
              </div>

              {/* Topic breakdown */}
              {progress.topics.length > 0 && (
                <div className="card" style={{ marginTop: "1.5rem" }}>
                  <h2 style={{ marginTop: 0 }}>Topic-Level Competency Breakdown</h2>
                  {progress.topics.map((t) => {
                    const level = accuracyLevel(t.accuracy);
                    const colors = {
                      high: "var(--color-success)",
                      mid:  "var(--color-warning)",
                      low:  "var(--color-info)",
                    };
                    return (
                      <div key={t.topic} className="topic-row">
                        <div className="topic-row-header">
                          <span className="topic-name" style={{ textTransform: "capitalize" }}>{t.topic}</span>
                          <span
                            className="topic-accuracy"
                            style={{ color: colors[level] }}
                          >
                            {Math.round(t.accuracy)}% accuracy ({LEVEL_LABELS[level]})
                          </span>
                        </div>
                        <div className="progress-bar-wrap">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${t.accuracy}%`, background: colors[level] }}
                            role="progressbar"
                            aria-valuenow={Math.round(t.accuracy)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${t.topic}: ${Math.round(t.accuracy)}% accuracy`}
                          />
                        </div>
                        <p style={{ fontSize: "0.78rem", margin: "0.15rem 0 0" }}>
                          {t.attempts} attempts · {t.correct} correct · {t.incorrect} incorrect
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {progress.topics.length === 0 && (
                <div className="alert alert-info" role="status" style={{ marginTop: "1rem" }}>
                  <span className="alert-icon" aria-hidden="true">ℹ</span>
                  <span>No practice data yet. Complete a practice session to see your progress here.</span>
                </div>
              )}
            </>
          )}

          {!loading && !progress && user && (
            <div className="alert alert-error" role="status" style={{ marginTop: "1rem" }}>
              <span aria-hidden="true">⚠</span>
              <span>Could not load your progress right now. Please try again later.</span>
            </div>
          )}
        </section>

        {/* ── Right: recommendations + recent ── */}
        <aside aria-labelledby="recommendations-heading">
          {progress && (
            <>
              <div className="card card-active" style={{ marginBottom: "1.5rem" }}>
                <span className="section-label">Recommended Next Study Path</span>
                <h2 id="recommendations-heading" style={{ marginTop: "0.25rem", fontSize: "1.1rem" }}>
                  {progress.topics.length > 0
                    ? `${progress.topics.sort((a, b) => a.accuracy - b.accuracy)[0]?.topic} Practice Mode`
                    : "Start Your First Practice Session"}
                </h2>
                <p style={{ fontSize: "0.85rem" }}>
                  {progress.topics.length > 0
                    ? "Based on recent practice activity, continuing your progress will improve your validated accuracy."
                    : "No practice sessions recorded yet. Begin a session to receive personalised recommendations."}
                </p>
                <Link to="/practice" className="btn btn-primary btn-sm">
                  Begin Recommended Practice
                  <kbd style={{ fontSize: "0.7rem", background: "rgba(0,0,0,0.2)", border: "none", color: "inherit", borderRadius: "3px", padding: "0.1em 0.4em" }}>Alt+P</kbd>
                </Link>
              </div>

              {/* Recent sessions */}
              {progress.recent_activity.length > 0 && (
                <div>
                  <h2 style={{ marginTop: 0, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Recent Completed Sessions
                  </h2>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {progress.recent_activity.slice(0, 5).map((item, i) => (
                      <li key={i} className="card" style={{ marginBottom: "0.75rem", padding: "0.9rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <strong style={{ color: "var(--color-text)" }}>{item.label}</strong>
                          <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>
                            {item.at ? new Date(item.at).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}>{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
