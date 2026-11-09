import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAuth } from "../auth/AuthContext";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

function progressLevel(acc) {
  if (acc >= 85) return "strong";
  if (acc >= 70) return "developing";
  return "getting-started";
}
const LEVEL_LABEL = { strong: "Strong", developing: "Developing", "getting-started": "Getting started" };

export default function ProgressPage() {
  usePageAnnouncement("Progress page. Loading your learning statistics.");
  useVoiceGuide({
    intro: "Progress page. This page shows how you are doing across all mathematics topics.",
    actions:
      "Your overall statistics will be read to you once they load. " +
      "To practise more, say: Practice. To go back, say: Home.",
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
        announce(
          `Progress loaded. ${data.total_attempts} total attempts. ` +
          `Overall accuracy: ${acc} percent. ` +
          (data.topics.length > 0
            ? `Topics: ${data.topics.map((t) => t.topic).join(", ")}.`
            : "No practice yet.")
        );
      })
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
  }, [token, announce]);

  return (
    <div>
      <section aria-labelledby="progress-heading">
        <span className="section-label">A Record of Your Work</span>
        <h1 id="progress-heading" style={{ marginBottom: "0.25rem" }}>Your Progress</h1>
        <p style={{ marginBottom: "1.5rem" }}>
          See what you've practised so far and where you might go next.
        </p>

        {!user && (
          <div className="alert alert-info" role="status">
            <span className="alert-icon" aria-hidden="true">ℹ</span>
            <span><Link to="/login">Log in</Link> to view your saved progress.</span>
          </div>
        )}

        {loading && <p aria-busy="true" aria-live="polite" style={{ color: "var(--color-text-muted)" }}>Loading your progress…</p>}

        {!loading && progress && (
          <>
            {/* Three stat cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "1.75rem" }}>
              <div className="stat-card-lg">
                <div className="stat-icon" aria-hidden="true">📖</div>
                <div className="stat-number">{progress.total_attempts}</div>
                <div className="stat-sublabel">Questions attempted</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)", marginTop: "0.2rem" }}>
                  Across all topics
                </div>
              </div>
              <div className="stat-card-lg">
                <div className="stat-icon" style={{ background: "rgba(16,185,129,0.12)", color: "var(--color-success)" }} aria-hidden="true">✓</div>
                <div className="stat-number" style={{ color: "var(--color-primary)" }}>
                  {Math.round(progress.overall_accuracy)}%
                </div>
                <div className="stat-sublabel">Overall accuracy</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)", marginTop: "0.2rem" }}>
                  {progress.total_correct} of {progress.total_attempts} correct
                </div>
              </div>
              <div className="stat-card-lg">
                <div className="stat-icon" style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-error)" }} aria-hidden="true">?</div>
                <div className="stat-number">{progress.total_incorrect}</div>
                <div className="stat-sublabel">Incorrect answers</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)", marginTop: "0.2rem" }}>
                  Each one is a chance to learn
                </div>
              </div>
            </div>

            {/* Topic progress */}
            {progress.topics.length > 0 && (
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Topic progress</h2>
                <p style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  Accuracy and practice by subject.
                </p>
                {progress.topics.map((t) => {
                  const level = progressLevel(t.accuracy);
                  return (
                    <div key={t.topic} className="topic-progress-row">
                      <div className="topic-progress-header">
                        <span className="topic-progress-name" style={{ textTransform: "capitalize" }}>
                          {t.topic}
                          <span>{t.attempts} questions</span>
                        </span>
                        <span className={`topic-progress-pct ${level}`}>
                          {Math.round(t.accuracy)}% · {LEVEL_LABEL[level]}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill ${level}`}
                          style={{ width: `${t.accuracy}%` }}
                          role="progressbar"
                          aria-valuenow={Math.round(t.accuracy)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${t.topic}: ${Math.round(t.accuracy)}% accuracy, ${LEVEL_LABEL[level]}`}
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="progress-legend" aria-label="Accuracy legend">
                  <span>
                    <span className="legend-dot" style={{ background: "var(--color-success)" }} aria-hidden="true" />
                    Strong: 85–100%
                  </span>
                  <span>
                    <span className="legend-dot" style={{ background: "var(--color-warning)" }} aria-hidden="true" />
                    Developing: 70–84%
                  </span>
                  <span>
                    <span className="legend-dot" style={{ background: "var(--color-error)" }} aria-hidden="true" />
                    Getting started: under 70%
                  </span>
                </div>
              </div>
            )}

            {progress.topics.length === 0 && (
              <div className="alert alert-info" role="status">
                <span className="alert-icon" aria-hidden="true">ℹ</span>
                <span>No practice data yet. Complete a practice session to see your progress.</span>
              </div>
            )}

            <Link to="/practice" className="btn btn-primary">
              Continue practising →
            </Link>
          </>
        )}

        {!loading && !progress && user && (
          <div className="alert alert-error" role="status">
            <span aria-hidden="true">⚠</span>
            <span>Could not load your progress right now. Please try again later.</span>
          </div>
        )}
      </section>
    </div>
  );
}
