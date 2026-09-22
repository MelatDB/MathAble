import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useAnnouncement } from "../../accessibility/AnnouncementContext";
import { usePageAnnouncement } from "../../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../../hooks/useVoiceGuide";

export default function TeacherDashboardPage() {
  usePageAnnouncement("Teacher Dashboard. View your students, assignments, and class performance.");
  useVoiceGuide({
    intro: "Teacher Dashboard. This is your overview of student activity, assignments, and class performance.",
    actions:
      "To view all your students and their progress, say: Students. " +
      "To create or manage assignments, say: Assignments. " +
      "To change your display or speech settings, say: Settings. " +
      "To log out, say: Log Out.",
  });
  const { user } = useAuth();
  const { announce } = useAnnouncement();
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/teacher/students"),
      api.get("/teacher/assignments"),
    ])
      .then(([s, a]) => {
        setStudents(s || []);
        setAssignments(a || []);
        announce(`Teacher dashboard loaded. ${s.length} students, ${a.length} assignments.`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [announce]);

  return (
    <div>
      <div className="context-banner" role="note">
        Teacher Dashboard — manage students, assignments and track performance
      </div>

      <section aria-labelledby="teacher-dash-heading" style={{ marginTop: "1.5rem" }}>
        <span className="section-label">Teacher Portal</span>
        <h1 id="teacher-dash-heading">
          Welcome back, {user?.name}
        </h1>
        <p>Your overview: student activity, assignments, and performance.</p>

        {loading && <p aria-busy="true" aria-live="polite" style={{ color: "var(--color-text-muted)" }}>Loading…</p>}

        {!loading && (
          <>
            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: "2rem" }}>
              <div className="stat-card">
                <div className="stat-value">{students.length}</div>
                <div className="stat-label">Total Students</div>
              </div>
              <div className="stat-card">
                <div className="stat-value stat-accent">{assignments.length}</div>
                <div className="stat-label">Assignments Created</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {students.length
                    ? Math.round(students.reduce((s, u) => s + u.overall_accuracy, 0) / students.length)
                    : 0}%
                </div>
                <div className="stat-label">Avg. Student Accuracy</div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="page-grid page-grid-2" style={{ maxWidth: "720px", marginBottom: "2rem" }}>
              <Link to="/teacher/students" className="feature-card" style={{ textDecoration: "none", display: "block" }}>
                <div className="feature-card-icon" aria-hidden="true">👥</div>
                <h3 style={{ color: "var(--color-text)", margin: "0.5rem 0 0.25rem" }}>View Students</h3>
                <p style={{ fontSize: "0.85rem", margin: 0 }}>Browse all students and inspect individual progress.</p>
              </Link>
              <Link to="/teacher/assignments" className="feature-card" style={{ textDecoration: "none", display: "block" }}>
                <div className="feature-card-icon" aria-hidden="true">📋</div>
                <h3 style={{ color: "var(--color-text)", margin: "0.5rem 0 0.25rem" }}>Manage Assignments</h3>
                <p style={{ fontSize: "0.85rem", margin: 0 }}>Create and track practice assignments.</p>
              </Link>
            </div>

            {/* Recent students */}
            {students.length > 0 && (
              <div>
                <h2>Recent Students</h2>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {students.slice(0, 5).map((s) => (
                    <li key={s.id} className="card" style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ color: "var(--color-text)" }}>{s.name}</strong>
                        <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem" }}>{s.email}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: 700 }}>
                          {s.overall_accuracy}% accuracy
                        </span>
                        <Link to={`/teacher/students/${s.id}`} className="btn btn-secondary btn-sm">
                          View
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
                {students.length > 5 && (
                  <Link to="/teacher/students" className="btn btn-ghost btn-sm">
                    See all {students.length} students →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
