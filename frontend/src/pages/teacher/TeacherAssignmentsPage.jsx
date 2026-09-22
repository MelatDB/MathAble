import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAnnouncement } from "../../accessibility/AnnouncementContext";
import { useVoiceGuide } from "../../hooks/useVoiceGuide";

const TOPICS = ["arithmetic", "algebra", "calculus", "other"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

export default function TeacherAssignmentsPage() {
  useVoiceGuide({
    intro: "Assignments page. Create and manage practice assignments for your students.",
    actions:
      "To create a new assignment, Tab to the New Assignment button and press Enter. " +
      "Fill in the title, choose a topic and difficulty, and set the number of questions. " +
      "Press Create Assignment when done. " +
      "Each existing assignment has a View Results button to see how students performed. " +
      "To go back to your teacher dashboard, say: Home.",
  });
  const { announce } = useAnnouncement();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [formError, setFormError]     = useState("");
  const [selectedId, setSelectedId]   = useState(null);   // for results panel
  const [results, setResults]         = useState(null);

  // form state
  const [title, setTitle]         = useState("");
  const [topic, setTopic]         = useState(TOPICS[0]);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1]);
  const [count, setCount]         = useState(5);
  const [desc, setDesc]           = useState("");

  const load = () => {
    setLoading(true);
    api.get("/teacher/assignments")
      .then((data) => setAssignments(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!title.trim()) { setFormError("Title is required."); return; }
    setCreating(true);
    try {
      const a = await api.post("/teacher/assignments", {
        title, topic, difficulty, question_count: count, description: desc,
      });
      setAssignments((prev) => [a, ...prev]);
      setShowForm(false);
      setTitle(""); setDesc("");
      announce(`Assignment "${a.title}" created.`);
    } catch (exc) {
      setFormError(exc instanceof ApiError ? exc.detail : "Could not create assignment.");
    } finally { setCreating(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this assignment?")) return;
    try {
      await api.put(`/teacher/assignments/${id}`, {}); // ping to confirm exists
      await fetch(`/api/teacher/assignments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("mathable_token")}` },
      });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) { setSelectedId(null); setResults(null); }
      announce("Assignment deleted.");
    } catch { announce("Could not delete.", true); }
  };

  const viewResults = async (id) => {
    if (selectedId === id) { setSelectedId(null); setResults(null); return; }
    try {
      const data = await api.get(`/teacher/assignments/${id}/results`);
      setSelectedId(id);
      setResults(data);
    } catch { announce("Could not load results.", true); }
  };

  return (
    <div>
      <div className="context-banner" role="note">Teacher Portal — Assignment Management</div>

      <section aria-labelledby="assignments-heading" style={{ marginTop: "1.5rem" }}>
        <span className="section-label">Assignment Management</span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <h1 id="assignments-heading" style={{ margin: 0 }}>Assignments</h1>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
            aria-controls="create-form"
          >
            {showForm ? "Cancel" : "+ New Assignment"}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div id="create-form" className="card" style={{ marginBottom: "1.5rem" }} aria-label="Create assignment form">
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Create New Assignment</h2>
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="a-title" className="field-label">Title</label>
                <input id="a-title" type="text" className="w-full" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Week 3 Algebra Review" />
              </div>

              <div className="field">
                <label htmlFor="a-desc" className="field-label">Description (optional)</label>
                <input id="a-desc" type="text" className="w-full" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief instructions for students" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="field">
                  <label htmlFor="a-topic" className="field-label">Topic</label>
                  <select id="a-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full">
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="a-diff" className="field-label">Difficulty</label>
                  <select id="a-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full">
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="a-count" className="field-label">Number of questions ({count})</label>
                <input id="a-count" type="range" min="1" max="20" value={count} onChange={(e) => setCount(Number(e.target.value))} aria-valuetext={`${count} questions`} />
              </div>

              {formError && (
                <div className="alert alert-error" role="alert" style={{ marginBottom: "0.75rem" }}>
                  <span aria-hidden="true">⚠</span><span>{formError}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={creating} aria-busy={creating}>
                {creating ? "Creating…" : "Create Assignment"}
              </button>
            </form>
          </div>
        )}

        {/* Assignment list */}
        {loading && <p aria-busy="true" style={{ color: "var(--color-text-muted)" }}>Loading…</p>}
        {!loading && assignments.length === 0 && (
          <p style={{ color: "var(--color-text-muted)" }}>No assignments yet. Create one above.</p>
        )}

        <ul style={{ listStyle: "none", padding: 0 }} aria-label="Assignment list">
          {assignments.map((a) => (
            <li key={a.id} className="card" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <strong style={{ color: "var(--color-text)", fontSize: "1rem" }}>{a.title}</strong>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem" }}>
                    {a.topic} · {a.difficulty} · {a.question_count} questions
                  </p>
                  {a.description && <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem" }}>{a.description}</p>}
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Created {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedId === a.id ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => viewResults(a.id)}
                    aria-pressed={selectedId === a.id}
                  >
                    {selectedId === a.id ? "Hide Results" : "View Results"}
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>
                    Delete
                  </button>
                </div>
              </div>

              {/* Results panel */}
              {selectedId === a.id && results && (
                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }} aria-label="Assignment results">
                  <h3 style={{ marginTop: 0, fontSize: "0.95rem" }}>Student Results</h3>
                  {results.results.length === 0 && (
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                      No students have attempted this assignment yet.
                    </p>
                  )}
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {results.results.map((r) => (
                      <li key={r.student_id} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--color-border)", fontSize: "0.875rem" }}>
                        <span style={{ color: "var(--color-text)" }}>{r.student_name}</span>
                        <span>
                          {r.correct}/{r.attempts} correct · <strong style={{ color: "var(--color-primary)" }}>{r.accuracy}%</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
