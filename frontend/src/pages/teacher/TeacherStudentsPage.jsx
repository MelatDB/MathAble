import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAnnouncement } from "../../accessibility/AnnouncementContext";
import { useVoiceGuide } from "../../hooks/useVoiceGuide";

// ── Student list view ──────────────────────────────────────────────────────
function StudentList() {
  useVoiceGuide({
    intro: "Students page. This lists all your registered students with their practice statistics.",
    actions:
      "Use Tab to move through the student list. " +
      "Press Enter on any student to view their detailed progress and solve history. " +
      "You can also search by typing a name or email in the search box. " +
      "To go back to your dashboard, say: Home.",
  });
  const { announce } = useAnnouncement();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/teacher/students")
      .then((data) => { setStudents(data || []); announce(`${data.length} students loaded.`); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [announce]);

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) ||
           s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="context-banner" role="note">Teacher Portal — Student List</div>
      <section aria-labelledby="students-heading" style={{ marginTop: "1.5rem" }}>
        <span className="section-label">Student Management</span>
        <h1 id="students-heading">All Students</h1>

        <div className="field" style={{ maxWidth: "28rem", marginBottom: "1.5rem" }}>
          <label htmlFor="student-search" className="field-label">Search students</label>
          <input
            id="student-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email…"
            className="w-full"
          />
        </div>

        {loading && <p aria-busy="true">Loading students…</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ color: "var(--color-text-muted)" }}>No students found.</p>
        )}

        <ul style={{ listStyle: "none", padding: 0 }} aria-label="Student list">
          {filtered.map((s) => (
            <li key={s.id} className="card" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <strong style={{ color: "var(--color-text)", fontSize: "1rem" }}>{s.name}</strong>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem" }}>{s.email}</p>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {s.total_attempts} attempts · Joined {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                    {s.overall_accuracy}%
                  </span>
                  <Link to={`/teacher/students/${s.id}`} className="btn btn-secondary btn-sm">
                    View Progress
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ── Single student detail view ─────────────────────────────────────────────
function StudentDetail() {
  const { id } = useParams();
  const { announce } = useAnnouncement();
  const [data, setData] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("progress");

  useEffect(() => {
    Promise.all([
      api.get(`/teacher/students/${id}/progress`),
      api.get(`/teacher/students/${id}/solutions`),
    ])
      .then(([prog, sols]) => {
        setData(prog);
        setSolutions(sols || []);
        announce(`Loaded progress for ${prog.student?.name}.`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, announce]);

  if (loading) return <p aria-busy="true" style={{ padding: "2rem", color: "var(--color-text-muted)" }}>Loading…</p>;
  if (!data) return (
    <section style={{ padding: "2rem" }}>
      <h1>Student not found</h1>
      <Link to="/teacher/students" className="btn btn-secondary btn-sm">← Back to students</Link>
    </section>
  );

  const student = data.student;
  const accuracy = Math.round(data.overall_accuracy);

  return (
    <div>
      <div className="context-banner" role="note">Teacher Portal — Student Profile</div>
      <section aria-labelledby="student-detail-heading" style={{ marginTop: "1.5rem" }}>
        <Link to="/teacher/students" className="btn btn-ghost btn-sm" style={{ marginBottom: "1rem", display: "inline-flex" }}>
          ← All Students
        </Link>

        <span className="section-label">Student Profile</span>
        <h1 id="student-detail-heading">{student.name}</h1>
        <p style={{ marginBottom: "1.5rem" }}>{student.email}</p>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="stat-card">
            <div className="stat-value">{data.total_attempts}</div>
            <div className="stat-label">Total Attempts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value stat-accent">{accuracy}%</div>
            <div className="stat-label">Overall Accuracy</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.total_correct}</div>
            <div className="stat-label">Correct Answers</div>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Student data tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {["progress", "solutions"].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-secondary"}`}
            >
              {t === "progress" ? "Topic Progress" : "Solve History"}
            </button>
          ))}
        </div>

        {/* Progress tab */}
        {tab === "progress" && (
          <div role="tabpanel" aria-label="Topic progress">
            {data.topics.length === 0 && (
              <p style={{ color: "var(--color-text-muted)" }}>No practice data yet for this student.</p>
            )}
            {data.topics.map((t) => (
              <div key={t.topic} className="topic-row">
                <div className="topic-row-header">
                  <span className="topic-name" style={{ textTransform: "capitalize" }}>{t.topic}</span>
                  <span className="topic-accuracy">{Math.round(t.accuracy)}%</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${t.accuracy}%` }}
                    role="progressbar" aria-valuenow={Math.round(t.accuracy)} aria-valuemin={0} aria-valuemax={100}
                    aria-label={`${t.topic}: ${Math.round(t.accuracy)}%`} />
                </div>
                <p style={{ fontSize: "0.78rem", margin: "0.15rem 0 0" }}>
                  {t.attempts} attempts · {t.correct} correct · {t.incorrect} incorrect
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Solutions tab */}
        {tab === "solutions" && (
          <div role="tabpanel" aria-label="Solve history">
            {solutions.length === 0 && (
              <p style={{ color: "var(--color-text-muted)" }}>No solved problems yet.</p>
            )}
            <ul style={{ listStyle: "none", padding: 0 }}>
              {solutions.map((s) => (
                <li key={s.id} className="card" style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div>
                      <code style={{ background: "none", border: "none", padding: 0, fontSize: "1rem", color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>
                        {s.input}
                      </code>
                      <p style={{ margin: "0.2rem 0 0" }}>
                        Answer: <strong style={{ color: "var(--color-text)" }}>{s.answer}</strong>
                      </p>
                      <em style={{ fontSize: "0.82rem" }}>{s.answer_spoken}</em>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", flexShrink: 0 }}>
                      {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Export: render list or detail based on route ───────────────────────────
export function TeacherStudentsPage()  { return <StudentList />; }
export function TeacherStudentDetailPage() { return <StudentDetail />; }
