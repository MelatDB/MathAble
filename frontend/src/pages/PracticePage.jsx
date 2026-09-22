import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { useTTS } from "../hooks/useTTS";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useFocusOnMount } from "../hooks/useFocusOnMount";
import { useVoiceNavActions } from "../navigation/useVoiceNavActions";
import { useVoiceNav } from "../navigation/VoiceNavProvider";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

const TOPICS = [
  { value: "arithmetic", label: "Arithmetic" },
  { value: "algebra",    label: "Algebra" },
  { value: "calculus",   label: "Calculus" },
  { value: "other",      label: "Other (roots, logs, trig)" },
];
const DIFFICULTIES = [
  { value: "beginner",     label: "Easy" },
  { value: "intermediate", label: "Medium" },
  { value: "advanced",     label: "Hard" },
];

export default function PracticePage() {
  usePageAnnouncement(
    "Practice page. Choose a mathematics topic and difficulty, " +
    "then press Start Practice Session to begin.",
  );

  useVoiceGuide({
    intro:
      "Practice page. Choose a topic and difficulty level, then answer questions one at a time. " +
      "MathAble will tell you if each answer is correct and explain how to solve it.",
    actions:
      "To choose a topic, say: Algebra, Arithmetic, Calculus, or Other. " +
      "To choose difficulty, say: Easy, Medium, or Hard. " +
      "When ready, say: Begin, or press the Start Practice Session button. " +
      "During a session, say: Read Question, to hear the current question. " +
      "Type your answer in the answer box, or say: Voice Input, to speak it. " +
      "Say: Submit, to check your answer. " +
      "After feedback, say: Read Explanation, to hear the full explanation. " +
      "Say: Next, to move to the next question. " +
      "At the end of the session you will hear your score and accuracy.",
  });

  const { announce }                       = useAnnouncement();
  const { settings }                       = useAccessibility();
  const { speak, stop: stopTTS, speaking } = useTTS();
  const { pauseNavForInput, resumeNavAfterInput } = useVoiceNav();

  const [topic,      setTopic]      = useState(TOPICS[0].value);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1].value);
  const [count,      setCount]      = useState(5);
  const [session,    setSession]    = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer,     setAnswer]     = useState("");
  const [feedback,   setFeedback]   = useState(null);
  const [history,    setHistory]    = useState([]);
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState("");
  const [finished,   setFinished]   = useState(false);

  const currentQ = session ? session.questions[currentIdx] : null;
  const totalQ   = session ? session.questions.length : 0;

  // Move focus to question heading when question changes
  const questionRef = useFocusOnMount(!!session && !finished);
  // Move focus to feedback when it appears
  const feedbackRef = useFocusOnMount(!!feedback);

  /* ── Voice input ── */
  const onVoiceResult = useCallback((t) => {
    setAnswer(t);
    // Announce what was heard and prompt to submit
    announce(`I heard: ${t}. Say Submit to check your answer, or speak again to change it.`);
    if (settings.tts_enabled) speak(`I heard: ${t}. Say Submit to check your answer.`);
  }, [announce, settings.tts_enabled, speak]);

  const { start: startListening, stop: stopListening, listening, error: voiceError } =
    useVoiceInput({ onResult: onVoiceResult, onNavPause: pauseNavForInput, onNavResume: resumeNavAfterInput });

  /* ── Generate session ── */
  const generate = async (e) => {
    e.preventDefault();
    setError(""); setSession(null); setCurrentIdx(0);
    setAnswer(""); setFeedback(null); setHistory([]); setFinished(false);
    setBusy(true);
    announce("Building your practice session. Please wait.");
    try {
      const data = await api.post("/practice/generate", { topic, difficulty, count });
      setSession(data);
      const q   = data.questions[0];
      const topicLabel = TOPICS.find((t) => t.value === data.topic)?.label ?? data.topic;
      const diffLabel  = DIFFICULTIES.find((d) => d.value === data.difficulty)?.label ?? data.difficulty;
      const msg =
        `Practice started. Topic: ${topicLabel}. Difficulty: ${diffLabel}. ` +
        `${data.question_count} question${data.question_count !== 1 ? "s" : ""}. ` +
        `Question 1: ${q?.prompt_spoken || q?.prompt}`;
      announce(msg);
      if (settings.tts_enabled) speak(msg);
    } catch (exc) {
      const d = exc instanceof ApiError ? exc.detail : "Could not start the practice session.";
      setError(d);
      announce(d, true);
    } finally { setBusy(false); }
  };

  /* ── Submit answer ── */
  const submit = async () => {
    const trimmed = answer.trim();
    if (!trimmed) {
      announce("Please type or speak your answer before submitting.", true);
      return;
    }
    setBusy(true);
    announce("Checking your answer. Please wait.");
    try {
      const data = await api.post("/practice/submit", {
        question_id: currentQ.id,
        answer: trimmed,
      });
      setFeedback(data);
      setHistory((prev) => [...prev, data]);

      let msg;
      if (data.correct) {
        msg =
          `Your answer is correct. ` +
          (data.explanation_spoken || data.explanation || "") +
          ` Press Next Question or press the Read Explanation button to hear more.`;
      } else {
        msg =
          `Your answer is incorrect. ` +
          `The correct answer is ${data.correct_answer_spoken || data.correct_answer}. ` +
          `Press Read Explanation to hear the full explanation.`;
      }
      announce(msg);
      if (settings.tts_enabled) speak(msg);
    } catch (exc) {
      const d = exc instanceof ApiError ? exc.detail : "Could not submit your answer.";
      announce(d, true);
    } finally { setBusy(false); }
  };

  /* ── Next question ── */
  const nextQuestion = () => {
    const next = currentIdx + 1;
    if (next >= totalQ) {
      setFinished(true);
      const correct = [...history, feedback].filter(Boolean).filter((h) => h.correct).length;
      const pct = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
      const msg =
        `Practice complete. You answered ${correct} out of ${totalQ} questions correctly. ` +
        `Your accuracy is ${pct} percent.`;
      announce(msg);
      if (settings.tts_enabled) speak(msg);
    } else {
      setCurrentIdx(next); setAnswer(""); setFeedback(null);
      const q   = session.questions[next];
      const msg = `Question ${next + 1} of ${totalQ}: ${q.prompt_spoken || q.prompt}`;
      announce(msg);
      if (settings.tts_enabled) speak(msg);
    }
  };

  const restart = () => {
    setSession(null); setCurrentIdx(0); setAnswer(""); setFeedback(null);
    setHistory([]); setFinished(false); setError("");
    announce("Practice session reset. Configure a new session on the left.");
  };

  // Register voice nav handlers — these update as session state changes
  useVoiceNavActions({
    readQuestion:   () => currentQ && speak(currentQ.prompt_spoken || currentQ.prompt),
    readExplanation:() => feedback && speak(feedback.correct
      ? `Correct. ${feedback.explanation_spoken || feedback.explanation}`
      : `Incorrect. The correct answer is ${feedback.correct_answer_spoken || feedback.correct_answer}. ${feedback.explanation}`),
    submitAnswer:   () => !feedback && submit(),
    nextQuestion:   () => feedback && nextQuestion(),
    startSession:   () => !session && document.querySelector("form")?.requestSubmit?.(),
    startVoiceInput:() => !feedback && startListening(),
    selectTopic:    (t) => { setTopic(t); announce(`Topic set to ${t}. Say Easy, Medium, or Hard to choose difficulty.`); },
    selectDifficulty:(d) => {
      setDifficulty(d);
      const label = DIFFICULTIES.find((x) => x.value === d)?.label ?? d;
      announce(`${label} difficulty selected. Say Begin to start the session.`);
    },
    // "answer 5" — fills the answer box directly and prompts to submit
    setAnswer: (v) => {
      if (v && !feedback) {
        setAnswer(v);
        const msg = `Answer set to ${v}. Say Submit to check your answer.`;
        announce(msg);
        if (settings.tts_enabled) speak(msg);
      }
    },
    readPage: () => {
      if (!session) {
        speak(`Practice setup. Topic: ${topic}. Difficulty: ${difficulty}. ${count} questions. Say Begin to start.`);
      } else if (currentQ) {
        speak(`Question ${currentIdx + 1} of ${totalQ}: ${currentQ.prompt_spoken || currentQ.prompt}`);
      }
    },
  });

  /* ── Finished screen ── */
  if (finished) {
    const correct = [...history].filter((h) => h.correct).length;
    const pct     = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
    return (
      <div>
        <div className="context-banner" role="note">
          Practice Complete
        </div>
        <section
          aria-labelledby="finish-heading"
          style={{ marginTop: "1.5rem" }}
          tabIndex={-1}
        >
          <span className="section-label">Session Complete</span>
          <h1 id="finish-heading">Practice Complete</h1>
          <p>
            You answered <strong>{correct}</strong> out of <strong>{totalQ}</strong>{" "}
            questions correctly. Your accuracy is <strong>{pct}%</strong>.
          </p>

          <div className="stats-grid" style={{ maxWidth: "500px", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <div className="stat-value">{correct}</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalQ - correct}</div>
              <div className="stat-label">Incorrect</div>
            </div>
            <div className="stat-card">
              <div className="stat-value stat-accent">{pct}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" style={{ marginBottom: "1.5rem" }}>
            <button type="button" className="btn btn-primary" onClick={restart}>
              New Practice Session
            </button>
            <Link to="/progress" className="btn btn-secondary">
              View Progress
            </Link>
          </div>

          <h2>Session Summary</h2>
          <ol aria-label="Practice session summary" style={{ listStyle: "none", padding: 0 }}>
            {history.map((fb, i) => (
              <li key={i} className="step-card" style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    Q{i + 1}: {fb.question.prompt}
                  </span>
                  <span
                    style={{
                      color: fb.correct ? "var(--color-success-text)" : "var(--color-error-text)",
                      fontWeight: 700,
                    }}
                    aria-label={fb.correct ? "Correct" : "Incorrect"}
                  >
                    {fb.correct ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                </div>
                {!fb.correct && (
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem" }}>
                    Correct answer:{" "}
                    <strong style={{ color: "var(--color-text)" }}>{fb.correct_answer}</strong>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="context-banner" role="note">
        {session
          ? `Practice — Question ${currentIdx + 1} of ${totalQ} — ${session.topic} · ${session.difficulty}`
          : "Practice — Configure your session"}
      </div>

      <div
        className="page-grid page-grid-sidebar-left"
        style={{ marginTop: "1.5rem", gap: "1.5rem" }}
      >
        {/* ── Left: setup sidebar ── */}
        <aside aria-labelledby="config-heading">
          <div className="card">
            <span className="section-label">Configure Practice</span>
            <h2 id="config-heading" style={{ marginTop: 0, fontSize: "1rem" }}>
              Topic &amp; Difficulty
            </h2>

            <form onSubmit={generate} aria-label="Practice session setup">
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
                <legend className="field-label">Mathematics Topic</legend>
                {TOPICS.map((t) => (
                  <div key={t.value} className="radio">
                    <input
                      id={`topic-${t.value}`}
                      type="radio"
                      name="topic"
                      value={t.value}
                      checked={topic === t.value}
                      onChange={() => {
                        setTopic(t.value);
                        announce(`Topic changed to ${t.label}.`);
                      }}
                    />
                    <label htmlFor={`topic-${t.value}`}>{t.label}</label>
                  </div>
                ))}
              </fieldset>

              <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
                <legend className="field-label">Difficulty Level</legend>
                <div className="flex gap-1">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      role="radio"
                      aria-checked={difficulty === d.value}
                      onClick={() => {
                        setDifficulty(d.value);
                        announce(`Difficulty set to ${d.label}.`);
                      }}
                      className={`btn btn-sm${difficulty === d.value ? " btn-primary" : " btn-secondary"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="field" style={{ marginBottom: "1rem" }}>
                <label htmlFor="practice-count" className="field-label">
                  Questions: {count}
                </label>
                <input
                  id="practice-count"
                  type="range"
                  min="1" max="20" step="1"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  aria-valuetext={`${count} questions`}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? "Building session…" : "Start Practice Session"}
              </button>

              {error && (
                <div className="alert alert-error" role="alert" style={{ marginTop: "0.75rem" }}>
                  <span aria-hidden="true">⚠ </span>{error}
                </div>
              )}
            </form>
          </div>
        </aside>

        {/* ── Right: active question area ── */}
        <section
          aria-labelledby={session ? "question-heading" : "no-session-msg"}
          aria-live="polite"
        >
          {!session ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
              <p
                id="no-session-msg"
                style={{ color: "var(--color-text-muted)", textAlign: "center" }}
              >
                Configure a practice session on the left and press Start.
              </p>
            </div>
          ) : (
            <div>
              {/* Progress */}
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  Question {currentIdx + 1} of {totalQ}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: 700 }}>
                  {Math.round((currentIdx / totalQ) * 100)}% complete
                </span>
              </div>
              <div className="progress-bar-wrap" style={{ marginBottom: "1.5rem" }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(currentIdx / totalQ) * 100}%` }}
                  role="progressbar"
                  aria-valuenow={currentIdx}
                  aria-valuemin={0}
                  aria-valuemax={totalQ}
                  aria-label={`Question ${currentIdx + 1} of ${totalQ}`}
                />
              </div>

              {/* Question */}
              <div
                ref={questionRef}
                tabIndex={-1}
                className="math-container"
                style={{ padding: "1.25rem", marginBottom: "0.5rem" }}
              >
                <h1
                  id="question-heading"
                  className="font-mono"
                  style={{ fontSize: "1.3rem", margin: 0, color: "var(--color-text)" }}
                  aria-label={`Question ${currentIdx + 1} of ${totalQ}: ${currentQ.prompt_spoken || currentQ.prompt}`}
                >
                  {currentQ.prompt}
                </h1>
              </div>

              <p
                style={{ fontStyle: "italic", fontSize: "0.85rem", margin: "0 0 0.5rem" }}
                aria-label="Question spoken description"
              >
                {currentQ.prompt_spoken}
              </p>

              {settings.tts_enabled && (
                <div className="audio-controls" style={{ marginBottom: "1rem" }}>
                  <button
                    type="button"
                    className="audio-btn"
                    onClick={() => speak(currentQ.prompt_spoken || currentQ.prompt)}
                    disabled={speaking}
                    aria-label="Read question aloud"
                  >
                    🔊 Read Question
                  </button>
                  {speaking && (
                    <button
                      type="button"
                      className="audio-btn audio-btn-stop"
                      onClick={stopTTS}
                      aria-label="Stop reading"
                    >
                      ■ Stop
                    </button>
                  )}
                </div>
              )}

              {/* Answer input */}
              {!feedback && (
                <div>
                  <div className="field">
                    <label htmlFor="practice-answer" className="field-label">
                      Your answer
                    </label>
                    <div style={{ position: "relative", maxWidth: "100%" }}>
                      <input
                        id="practice-answer"
                        type="text"
                        className="math-input w-full"
                        style={{
                          maxWidth: "100%",
                          paddingRight: settings.voice_input_enabled ? "7rem" : "0.9rem",
                        }}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                        autoFocus
                        autoComplete="off"
                        placeholder="Type your answer…"
                        aria-label={`Your answer to: ${currentQ.prompt_spoken || currentQ.prompt}`}
                        aria-describedby="answer-hint"
                      />
                      {settings.voice_input_enabled && (
                        <button
                          type="button"
                          className={`voice-btn${listening ? " voice-btn-active" : ""}`}
                          style={{
                            position: "absolute", right: "0.5rem", top: "50%",
                            transform: "translateY(-50%)",
                            padding: "0.3rem 0.6rem", fontSize: "0.75rem",
                          }}
                          onClick={listening ? stopListening : startListening}
                          aria-label={listening ? "Stop voice input" : "Speak your answer"}
                          aria-pressed={listening}
                        >
                          🎤 {listening ? "Stop" : "Voice"}
                        </button>
                      )}
                    </div>
                    <span
                      id="answer-hint"
                      style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block", marginTop: "0.2rem" }}
                    >
                      Press 🎤 to speak your answer, or type it. Then press Enter or say Submit.
                    </span>
                  </div>

                  {voiceError && (
                    <div className="alert alert-error" role="alert" style={{ marginBottom: "0.75rem" }}>
                      <span aria-hidden="true">⚠ </span>{voiceError}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submit}
                      disabled={busy}
                      aria-busy={busy}
                    >
                      {busy ? "Checking…" : "Submit Answer"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={nextQuestion}
                      aria-label="Skip this question and move to the next"
                    >
                      Skip Question
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div
                  ref={feedbackRef}
                  tabIndex={-1}
                  aria-live="assertive"
                  style={{ marginTop: "1rem" }}
                >
                  <div
                    className={`alert ${feedback.correct ? "alert-success" : "alert-error"}`}
                    role={feedback.correct ? "status" : "alert"}
                  >
                    <span className="alert-icon" aria-hidden="true">
                      {feedback.correct ? "✓" : "✗"}
                    </span>
                    <div className="alert-content">
                      <p className="alert-title">
                        {feedback.correct
                          ? "Your answer is correct!"
                          : "Your answer is incorrect."}
                      </p>
                      {!feedback.correct && (
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
                          The correct answer is{" "}
                          <strong className="font-mono">{feedback.correct_answer}</strong>
                          {feedback.correct_answer_spoken
                            ? ` (${feedback.correct_answer_spoken})`
                            : ""}.
                        </p>
                      )}
                    </div>
                  </div>

                  {feedback.explanation && (
                    <div className="step-card" style={{ marginTop: "0.75rem" }}>
                      <div className="step-label">Explanation</div>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text)" }}>
                        {feedback.explanation}
                      </p>
                    </div>
                  )}

                  {settings.tts_enabled && (
                    <div className="audio-controls" style={{ margin: "0.75rem 0" }}>
                      <button
                        type="button"
                        className="audio-btn"
                        onClick={() =>
                          speak(
                            feedback.correct
                              ? `Correct. ${feedback.explanation_spoken || feedback.explanation}`
                              : `Incorrect. The correct answer is ${feedback.correct_answer_spoken || feedback.correct_answer}. ${feedback.explanation}`,
                          )
                        }
                        disabled={speaking}
                        aria-label="Read explanation aloud"
                      >
                        🔊 Read Explanation
                      </button>
                      {speaking && (
                        <button type="button" className="audio-btn audio-btn-stop" onClick={stopTTS}>
                          ■ Stop
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: "0.5rem" }}
                    onClick={nextQuestion}
                  >
                    {currentIdx + 1 >= totalQ ? "Finish Session" : "Next Question"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
