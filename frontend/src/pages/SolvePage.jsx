import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { MathDisplay } from "../components/MathDisplay";
import { useTTS } from "../hooks/useTTS";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useFocusOnMount } from "../hooks/useFocusOnMount";
import { useVoiceNavActions } from "../navigation/useVoiceNavActions";
import { useVoiceNav } from "../navigation/VoiceNavProvider";
import { useVoiceGuide } from "../hooks/useVoiceGuide";

const TEMPLATES = [
  { category: "Algebra",      label: "2x + 5 = 15",              desc: "Linear equation" },
  { category: "Algebra",      label: "x^2 + 5x + 6 = 0",         desc: "Quadratic equation" },
  { category: "Arithmetic",   label: "3/4 + 1/2",                 desc: "Fraction addition" },
  { category: "Calculus",     label: "differentiate x^2",         desc: "Derivative" },
  { category: "Calculus",     label: "integrate x^2",             desc: "Integral" },
];

export default function SolvePage() {
  const { announce }                       = useAnnouncement();
  const { settings }                       = useAccessibility();
  const { speak, stop: stopTTS, speaking } = useTTS();
  const navigate                           = useNavigate();
  const { pauseNavForInput, resumeNavAfterInput } = useVoiceNav();

  const [expression, setExpression]     = useState("");
  const [pendingVoice, setPendingVoice] = useState("");
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState("");
  const [busy, setBusy]                 = useState(false);

  // Focus management: move focus to solution/error when they appear
  const solutionRef = useFocusOnMount(!!result);
  const errorRef    = useFocusOnMount(!!error);

  // Announce page context on mount
  usePageAnnouncement(
    "Math Solver page. Enter a mathematics problem in the text area, " +
    "or press the Voice Input button to speak your expression. " +
    "Press Enter or the Solve button to get a step-by-step solution.",
  );

  useVoiceGuide({
    intro:
      "Math Solver. You can type any mathematics problem and MathAble will solve it step by step, " +
      "explaining each step in plain English.",
    actions:
      "To enter a problem, click or Tab to the input box and type your expression. " +
      "For example: two x plus five equals fifteen, or x squared plus five x plus six equals zero. " +
      "To use your voice, say: Voice Input. Speak your expression clearly, then confirm what you said. " +
      "When you are ready, say: Solve, or press Enter. " +
      "After the solution appears, say: Read Solution, to hear the full answer and all steps. " +
      "Say: Read Question, to hear the problem again. " +
      "Say: Practice, to practise similar questions. " +
      "Say: New Problem, to start again. " +
      "You can also load an example by pressing Tab to reach the Quick Templates section.",
  });

  /* ── Voice input ── */
  const onVoiceResult = useCallback((transcript) => {
    setPendingVoice(transcript);
    // useVoiceInput already announced "I heard: …" — no double announcement
  }, []);

  const {
    start: startListening,
    stop: stopListening,
    listening,
    supported: voiceSupported,
    error: voiceError,
  } = useVoiceInput({
    onResult: onVoiceResult,
    onNavPause: pauseNavForInput,
    onNavResume: resumeNavAfterInput,
  });

  const confirmVoice = () => {
    setExpression(pendingVoice);
    setPendingVoice("");
    announce("Expression confirmed. Press Solve to get the solution.");
  };

  const discardVoice = () => {
    setPendingVoice("");
    announce("Voice input discarded. You can type your expression or try voice again.");
  };

  /* ── Solve ── */
  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = expression.trim();
    if (!trimmed) {
      const msg = "Please enter a mathematics expression before solving.";
      setError(msg);
      announce(msg, true);
      return;
    }
    setBusy(true);
    setResult(null);
    announce("Solving your problem. Please wait.");
    try {
      const data = await api.post("/solve", { expression: trimmed });
      setResult(data);
      const stepCount = data.steps.length;
      const msg = data.supported
        ? `Solution ready. ${stepCount} step${stepCount !== 1 ? "s" : ""} found. ` +
          `The answer is ${data.answer_spoken}. ` +
          `Press Read Solution to hear the full explanation.`
        : data.message;
      announce(msg);
      if (settings.tts_enabled) speak(msg);
    } catch (exc) {
      const detail = exc instanceof ApiError ? exc.detail : "The solver could not run. Please check your expression.";
      setError(detail);
      announce(detail, true);
      if (settings.tts_enabled) speak(detail);
    } finally {
      setBusy(false);
    }
  };

  const readFullSolution = () => {
    if (!result) return;
    const intro = `Answer: ${result.answer_spoken}. `;
    const steps = result.steps
      .map((s, i) => `Step ${i + 1}: ${s.title}. ${s.spoken}`)
      .join(" ");
    speak(intro + steps);
  };

  // Register voice nav action handlers for this page
  useVoiceNavActions({
    readSolution:    () => result && readFullSolution(),
    readQuestion:    () => result && speak(result.answer_spoken),
    startVoiceInput: () => startListening(),
    confirm:         () => pendingVoice && confirmVoice(),
    discard:         () => pendingVoice && discardVoice(),
    newProblem:      () => { setResult(null); setExpression(""); announce("Ready for a new problem."); },
    // "answer X" fills the expression box (reuses setAnswer for solver context)
    setAnswer: (v) => {
      if (v) {
        setExpression(v);
        announce(`Expression set to ${v}. Say Solve to get the solution.`);
      }
    },
    // "solve X" sets expression and immediately solves
    solveExpression: (expr) => {
      if (expr) {
        setExpression(expr);
        // Small delay to let state update before submitting
        setTimeout(() => {
          const form = document.querySelector("form");
          if (form) form.requestSubmit();
        }, 100);
      }
    },
    readPage: () => {
      const txt =
        "Math Solver. " +
        (expression ? `Current expression: ${expression}. ` : "Input is empty. ") +
        (result ? `Solution: ${result.answer_spoken}.` : "No solution yet.");
      speak(txt);
    },
  });

  return (
    <div>
      <div className="context-banner" role="note" aria-label="Page tip">
        Math Solver · Type an expression or use Voice Input · Press Enter to solve
      </div>

      <div className="page-grid page-grid-sidebar" style={{ marginTop: "1.5rem", gap: "2rem" }}>
        {/* ── Left: input + result ── */}
        <section aria-labelledby="solve-heading">
          <span className="section-label">Math Solver</span>
          <h1 id="solve-heading">Enter Mathematical Problem</h1>
          <p id="solve-desc">
            Type any expression — like <code>x^2 + 5x + 6 = 0</code> or{" "}
            <code>differentiate x^2</code> — or press the Voice Input button to speak it.
            Press Enter or the Solve button to get a step-by-step solution.
          </p>

          <form onSubmit={onSubmit} aria-describedby="solve-desc" noValidate>
            <div className="field">
              <label htmlFor="solve-expression" className="field-label">
                Mathematics expression
              </label>
              <textarea
                id="solve-expression"
                className="math-input w-full"
                rows={3}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. x^2 + 5x + 6 = 0"
                autoComplete="off"
                spellCheck={false}
                aria-describedby={error ? "solve-error" : "solve-input-hint"}
                aria-invalid={!!error}
              />
              <span
                id="solve-input-hint"
                style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block", marginTop: "0.25rem" }}
              >
                {expression
                  ? `Current expression: ${expression}`
                  : "Empty. Type your expression or use voice input."}
              </span>
            </div>

            {/* Voice confirmation panel — announced by useVoiceInput */}
            {pendingVoice && (
              <div
                className="card"
                role="region"
                aria-label="Voice recognition result — confirmation required"
                aria-live="polite"
                style={{ marginBottom: "1rem", borderColor: "var(--color-primary)" }}
              >
                <p style={{ margin: "0 0 0.25rem", fontWeight: 600 }}>
                  Confirmation required
                </p>
                <p style={{ margin: "0 0 0.75rem" }}>
                  I heard:{" "}
                  <strong
                    className="font-mono"
                    style={{ color: "var(--color-primary)" }}
                    aria-label={`Recognised expression: ${pendingVoice}`}
                  >
                    {pendingVoice}
                  </strong>
                </p>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  Is this the correct expression?
                </p>
                <div className="flex gap-1 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={confirmVoice}
                    autoFocus
                  >
                    Confirm — use this expression
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={discardVoice}
                  >
                    Discard — type instead
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { discardVoice(); startListening(); }}
                  >
                    Speak again
                  </button>
                </div>
              </div>
            )}

            {voiceError && (
              <div
                className="alert alert-error"
                role="alert"
                aria-live="assertive"
                style={{ marginBottom: "1rem" }}
              >
                <span aria-hidden="true">⚠ </span>
                {voiceError}
              </div>
            )}

            {error && (
              <div
                id="solve-error"
                ref={errorRef}
                className="alert alert-error"
                role="alert"
                tabIndex={-1}
                style={{ marginBottom: "1rem" }}
              >
                <span aria-hidden="true">⚠ </span>
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-1" style={{ marginTop: "0.5rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy}
                aria-busy={busy}
                aria-describedby="solve-desc"
              >
                {busy ? "Solving…" : "Solve"}
              </button>

              {settings.voice_input_enabled && (
                <button
                  type="button"
                  className={`voice-btn${listening ? " voice-btn-active" : ""}`}
                  onClick={listening ? stopListening : startListening}
                  aria-label={
                    listening
                      ? "Stop voice input"
                      : voiceSupported
                      ? "Start voice input — speak your expression"
                      : "Voice input not available in this browser"
                  }
                  aria-pressed={listening}
                >
                  🎤 {listening ? "Stop Listening" : "Voice Input"}
                </button>
              )}

              {!voiceSupported && settings.voice_input_enabled && (
                <span
                  role="status"
                  style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", alignSelf: "center" }}
                >
                  Voice input unavailable in this browser.
                </span>
              )}

              {expression && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setExpression(""); setResult(null); setError("");
                    announce("Workspace cleared. Enter a new expression.");
                  }}
                  aria-label="Clear workspace and start over"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Loading state */}
          {busy && (
            <p
              aria-live="polite"
              aria-busy="true"
              style={{ marginTop: "1rem", color: "var(--color-text-muted)" }}
            >
              Solving your problem, please wait…
            </p>
          )}

          {/* ── Solution ── */}
          {result && (
            <article
              ref={solutionRef}
              tabIndex={-1}
              aria-labelledby="solution-heading"
              aria-live="polite"
              style={{ marginTop: "2rem" }}
            >
              <span className="section-label">Solution</span>
              <h2 id="solution-heading">
                {result.supported ? "Step-by-Step Breakdown" : "Result"}
              </h2>

              {/* Problem re-stated */}
              <div
                className="math-container"
                aria-label={`Problem: ${result.interpreted}`}
                style={{ marginBottom: "0.75rem" }}
              >
                <span className="font-mono">{result.input}</span>
              </div>
              <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                Read as: <em>{result.answer_spoken}</em>
              </p>

              {/* Final answer */}
              <div
                className="math-answer-box"
                aria-label={`Answer: ${result.answer_spoken}`}
              >
                <div className="math-answer-label">Answer</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span className="math-answer-value">{result.answer}</span>
                  {settings.tts_enabled && (
                    <div className="audio-controls">
                      <button
                        type="button"
                        className="audio-btn"
                        onClick={() => speak(result.answer_spoken)}
                        disabled={speaking}
                        aria-label={`Read answer aloud: ${result.answer_spoken}`}
                      >
                        🔊 Read Answer
                      </button>
                      <button
                        type="button"
                        className="audio-btn"
                        onClick={readFullSolution}
                        disabled={speaking}
                        aria-label="Read full solution with all steps"
                      >
                        🔊 Read Full Solution
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
                </div>
              </div>

              {result.answer_mathml && (
                <MathDisplay mathml={result.answer_mathml} spoken={result.answer_spoken} />
              )}

              {/* Steps */}
              {result.steps.length > 0 && (
                <div>
                  <h3 style={{ marginTop: "1.5rem" }}>
                    {result.steps.length} step{result.steps.length !== 1 ? "s" : ""}
                  </h3>
                  <ol
                    aria-label="Solution steps"
                    style={{ listStyle: "none", padding: 0, margin: 0 }}
                  >
                    {result.steps.map((step, i) => (
                      <li key={i} className="step-card">
                        <div className="step-label">
                          Step {i + 1} of {result.steps.length}: {step.title}
                        </div>
                        {step.math && (
                          <div
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}
                          >
                            {step.mathml
                              ? <MathDisplay mathml={step.mathml} spoken={step.spoken} inline />
                              : <code className="step-math">{step.math}</code>
                            }
                            {settings.tts_enabled && step.spoken && (
                              <button
                                type="button"
                                className="audio-btn btn-sm"
                                onClick={() => speak(`Step ${i + 1}: ${step.title}. ${step.spoken}`)}
                                disabled={speaking}
                                aria-label={`Read step ${i + 1} aloud`}
                              >
                                🔊 Step {i + 1}
                              </button>
                            )}
                          </div>
                        )}
                        {step.spoken && (
                          <p
                            className="step-audio-row"
                            aria-label={`Step ${i + 1} description: ${step.spoken}`}
                          >
                            <span className="step-audio-icon" aria-hidden="true">🔊</span>
                            <em>{step.spoken}</em>
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex flex-wrap gap-1" style={{ marginTop: "1.25rem" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate("/practice")}
                >
                  Practice Similar Questions
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setResult(null);
                    setExpression("");
                    announce("Ready for a new problem. Enter your expression.");
                  }}
                >
                  New Problem
                </button>
              </div>
            </article>
          )}
        </section>

        {/* ── Right: templates ── */}
        <aside aria-labelledby="templates-heading">
          <span className="section-label">Example Expressions</span>
          <h2 id="templates-heading" style={{ marginTop: 0, fontSize: "1rem" }}>
            Quick Templates
          </h2>
          <p style={{ fontSize: "0.82rem" }}>
            Select a template to load it into the input field, then press Solve.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {TEMPLATES.map((t) => (
              <li key={t.label} style={{ marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  className="card"
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: "0.5rem", padding: "0.75rem",
                  }}
                  onClick={() => {
                    setExpression(t.label);
                    announce(`Template loaded: ${t.desc}. Press Solve to get the solution.`);
                  }}
                  aria-label={`Load template: ${t.desc} — ${t.label}`}
                >
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.2rem" }}>
                      {t.category}
                    </div>
                    <code style={{ background: "none", border: "none", padding: 0, color: "var(--color-text)", fontSize: "0.9rem" }}>
                      {t.label}
                    </code>
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem" }}>{t.desc}</p>
                  </div>
                  <span aria-hidden="true" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Load
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
