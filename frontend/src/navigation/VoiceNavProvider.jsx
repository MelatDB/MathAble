/**
 * VoiceNavProvider — centralized always-on voice navigation system.
 *
 * KEY DESIGN DECISIONS
 * ────────────────────
 * 1. All mutable values used inside SpeechRecognition callbacks are accessed
 *    via refs, never captured in stale closures.  This is the main fix for
 *    unreliable behaviour.
 *
 * 2. The recognition session is non-continuous on browsers where continuous
 *    mode is unreliable (Chrome sometimes silently stops the session after
 *    a result).  We restart explicitly after every result instead.
 *
 * 3. navSpeak queues confirmation speech AFTER the current utterance ends
 *    rather than cancelling it, so page-guide speech is not cut off.
 *
 * 4. The unknown-command response only fires for phrases ≥ 3 words, reducing
 *    noise from background sounds or partial recognition.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "./NavigationContext";
import { matchCommand, looksLikeMath } from "./voiceCommands";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAuth } from "../auth/AuthContext";

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

const VoiceNavContext = createContext(null);

/* ── Speak without disrupting an ongoing utterance ──────────────────────── */
function speakQueued(text, rate = 1, voiceName = "") {
  if (!("speechSynthesis" in window) || !text) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  if (voiceName) {
    const match = synth.getVoices().find((v) => v.name === voiceName);
    if (match) u.voice = match;
  }
  // If already speaking (e.g. page guide), queue after it finishes.
  // If silent, speak immediately.
  synth.speak(u);
}

export function VoiceNavProvider({ children, ttsRate = 10, ttsVoice = "" }) {
  const { voiceActive }   = useNavigation();
  const { announce }      = useAnnouncement();
  const { user, logout }  = useAuth();
  const navigate          = useNavigate();

  /* ── All volatile values in refs so callbacks always see current values ── */
  const voiceActiveRef  = useRef(voiceActive);
  const userRef         = useRef(user);
  const navigateRef     = useRef(navigate);
  const announceRef     = useRef(announce);
  const logoutRef       = useRef(logout);
  const ttsRateRef      = useRef(ttsRate);
  const ttsVoiceRef     = useRef(ttsVoice);

  useEffect(() => { voiceActiveRef.current  = voiceActive; },  [voiceActive]);
  useEffect(() => { userRef.current         = user; },         [user]);
  useEffect(() => { navigateRef.current     = navigate; },     [navigate]);
  useEffect(() => { announceRef.current     = announce; },     [announce]);
  useEffect(() => { logoutRef.current       = logout; },       [logout]);
  useEffect(() => { ttsRateRef.current      = ttsRate; },      [ttsRate]);
  useEffect(() => { ttsVoiceRef.current     = ttsVoice; },     [ttsVoice]);

  /* ── Action registry ─────────────────────────────────────────────────── */
  const actionRegistryRef = useRef({});
  const registerActions = useCallback((handlers) => {
    actionRegistryRef.current = handlers;
    return () => { actionRegistryRef.current = {}; };
  }, []);

  /* ── Dangerous-command confirmation ──────────────────────────────────── */
  const pendingDangerousRef         = useRef(null);
  const [pendingDangerous, setPendingDangerous] = useState(null);

  /* ── Session state ───────────────────────────────────────────────────── */
  const [navListening, setNavListening] = useState(false);
  const recognitionRef  = useRef(null);
  const restartTimerRef = useRef(null);
  const pausedRef       = useRef(false);
  // Track whether we are currently in the middle of speaking a confirmation
  // to avoid double-firing the unknown-command response.
  const speakingConfirmRef = useRef(false);

  /* ── navSpeak — queue speech without cancelling current utterance ─────── */
  const navSpeak = useCallback((text) => {
    if (!text) return;
    speakQueued(text, ttsRateRef.current / 10, ttsVoiceRef.current);
  }, []);

  /* ── Pause / resume for math voice input ─────────────────────────────── */
  const pauseNavForInput = useCallback(() => {
    pausedRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch { /* ignore */ }
      recognitionRef.current = null;
      setNavListening(false);
    }
  }, []);

  const resumeNavAfterInput = useCallback(() => {
    pausedRef.current = false;
    restartTimerRef.current = setTimeout(() => startSession(), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Dispatch an action ──────────────────────────────────────────────── */
  const dispatchAction = useCallback((action, captured) => {
    const reg = actionRegistryRef.current;
    const nav = navigateRef.current;
    const u   = userRef.current;

    switch (action) {
      case "NAV_DASHBOARD":
      case "NAV_HOME":
        nav(u?.role === "teacher" ? "/teacher" : "/"); break;
      case "NAV_SOLVE":       nav("/solve");       break;
      case "NAV_PRACTICE":    nav("/practice");    break;
      case "NAV_PROGRESS":    nav("/progress");    break;
      case "NAV_STORY":       nav("/story");       break;
      case "NAV_SETTINGS":    nav("/settings");    break;
      case "NAV_HELP":        nav("/help");        break;
      case "NAV_BACK":        nav(-1);             break;
      case "NAV_LOGIN":       nav("/login");       break;
      case "NAV_REGISTER":    nav("/register");    break;
      case "NAV_TEACHER":     nav("/teacher");     break;
      case "NAV_TEACHER_STUDENTS":    nav("/teacher/students");    break;
      case "NAV_TEACHER_ASSIGNMENTS": nav("/teacher/assignments"); break;

      case "STOP_TTS":
        window.speechSynthesis?.cancel(); break;
      case "READ_SOLUTION":    reg.readSolution?.();    break;
      case "READ_QUESTION":    reg.readQuestion?.();    break;
      case "READ_EXPLANATION": reg.readExplanation?.(); break;
      case "READ_PAGE":        reg.readPage?.();        break;

      case "NEXT":             reg.nextQuestion?.();    break;
      case "PREV":             reg.prevQuestion?.();    break;
      case "SUBMIT":           reg.submitAnswer?.();    break;
      case "START_SESSION":    reg.startSession?.();    break;
      case "START_VOICE_INPUT":reg.startVoiceInput?.(); break;
      case "CONFIRM":          reg.confirm?.();         break;
      case "DISCARD":          reg.discard?.();         break;
      case "NEW_PROBLEM":      reg.newProblem?.();      break;

      // Answer dictation — fills the answer field directly
      case "SET_ANSWER":
        if (captured) reg.setAnswer?.(captured);
        break;

      // Solve expression dictated inline — fills expression and triggers solve
      case "SOLVE_EXPRESSION":
        if (captured) reg.solveExpression?.(captured);
        break;

      case "SELECT_TOPIC_ARITHMETIC":  reg.selectTopic?.("arithmetic");   break;
      case "SELECT_TOPIC_ALGEBRA":     reg.selectTopic?.("algebra");      break;
      case "SELECT_TOPIC_CALCULUS":    reg.selectTopic?.("calculus");     break;
      case "SELECT_TOPIC_OTHER":       reg.selectTopic?.("other");        break;
      case "SELECT_DIFF_BEGINNER":     reg.selectDifficulty?.("beginner");     break;
      case "SELECT_DIFF_INTERMEDIATE": reg.selectDifficulty?.("intermediate"); break;
      case "SELECT_DIFF_ADVANCED":     reg.selectDifficulty?.("advanced");     break;

      // Settings commands
      case "SET_NAV_VOICE":    reg.setNavMode?.("voice");    break;
      case "SET_NAV_KEYBOARD": reg.setNavMode?.("keyboard"); break;
      case "SET_NAV_COMBINED": reg.setNavMode?.("combined"); break;
      case "TTS_ON":           reg.setTTS?.(true);           break;
      case "TTS_OFF":          reg.setTTS?.(false);          break;
      case "TTS_RATE_SLOW":    reg.setTTSRate?.(5);          break;
      case "TTS_RATE_NORMAL":  reg.setTTSRate?.(10);         break;
      case "TTS_RATE_FAST":    reg.setTTSRate?.(16);         break;
      case "SAVE_SETTINGS":    reg.saveSettings?.();         break;

      case "LOGOUT": break; // handled separately
      default: break;
    }
  }, []);

  /* ── Process a recognised transcript ────────────────────────────────── */
  const processTranscript = useCallback((transcript) => {
    const text = transcript.trim();
    if (!text) return;

    // ── Dangerous-command confirmation ───────────────────────────────────
    if (pendingDangerousRef.current) {
      const yes = /\b(yes|yeah|yep|confirm|do\s+it)\b/i.test(text);
      const no  = /\b(no|nope|cancel|never)\b/i.test(text);
      if (yes) {
        navSpeak("Logging out. Goodbye.");
        pendingDangerousRef.current = null;
        setPendingDangerous(null);
        setTimeout(() => logoutRef.current(), 1400);
      } else if (no) {
        navSpeak("Logout cancelled.");
        pendingDangerousRef.current = null;
        setPendingDangerous(null);
      } else {
        navSpeak("Please say yes to confirm or no to cancel.");
      }
      return;
    }

    // ── Skip mathematical expressions ────────────────────────────────────
    if (looksLikeMath(text)) return;

    // ── Match command ────────────────────────────────────────────────────
    const match = matchCommand(text);

    if (!match) {
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount >= 3) {
        const msg =
          "I didn't understand. Try: Practice, Solver, Progress, Help, Back, or Settings.";
        announceRef.current(msg);
        navSpeak(msg);
      }
      return;
    }

    const { cmd, captured } = match;

    // ── Dangerous command ────────────────────────────────────────────────
    if (cmd.dangerous) {
      pendingDangerousRef.current = cmd;
      setPendingDangerous(cmd);
      navSpeak(cmd.confirm);
      announceRef.current(cmd.confirm);
      return;
    }

    // ── Dynamic confirm message for captured-value commands ──────────────
    let confirmMsg = cmd.confirm;
    if (cmd.action === "SET_ANSWER" && captured) {
      confirmMsg = `I heard: ${captured}. Say Submit to submit or Change Answer to try again.`;
    }
    if (cmd.action === "SOLVE_EXPRESSION" && captured) {
      confirmMsg = `I heard: ${captured}. Solving now.`;
    }

    if (confirmMsg) {
      navSpeak(confirmMsg);
      announceRef.current(confirmMsg);
    }
    dispatchAction(cmd.action, captured);
  }, [navSpeak, dispatchAction]);

  // Keep processTranscript in a ref for use inside the recognition callback.
  const processTranscriptRef = useRef(processTranscript);
  useEffect(() => { processTranscriptRef.current = processTranscript; }, [processTranscript]);

  /* ── Start a single (non-continuous) recognition session ─────────────── */
  // We use non-continuous mode and restart manually after each result.
  // This is more reliable than continuous mode across Chrome versions.
  function startSession() {
    if (!SpeechRecognition) return;
    if (!voiceActiveRef.current) return;
    if (pausedRef.current) return;
    if (recognitionRef.current) return; // already running

    const r = new SpeechRecognition();
    r.lang            = "en-US";
    r.continuous      = false; // restart manually — more reliable
    r.interimResults  = false;
    r.maxAlternatives = 1;
    recognitionRef.current = r;

    r.onresult = (event) => {
      const result = event.results[0];
      if (result.isFinal) {
        processTranscriptRef.current(result[0].transcript);
      }
    };

    r.onerror = (event) => {
      // no-speech is normal — just restart
      if (event.error === "no-speech") {
        recognitionRef.current = null;
        setNavListening(false);
        scheduleRestart();
        return;
      }
      if (event.error === "not-allowed") {
        recognitionRef.current = null;
        setNavListening(false);
        announceRef.current(
          "Microphone permission denied. Voice navigation is unavailable. " +
          "Please allow microphone access in your browser settings.",
          true,
        );
        return;
      }
      // Other errors — just restart
      recognitionRef.current = null;
      setNavListening(false);
      scheduleRestart();
    };

    r.onend = () => {
      recognitionRef.current = null;
      setNavListening(false);
      // Always restart while voice is active and not paused
      if (voiceActiveRef.current && !pausedRef.current) {
        scheduleRestart();
      }
    };

    try {
      r.start();
      setNavListening(true);
    } catch {
      recognitionRef.current = null;
      scheduleRestart();
    }
  }

  function scheduleRestart() {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => startSession(), 250);
  }

  /* ── Stop everything cleanly ─────────────────────────────────────────── */
  const stopAll = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setNavListening(false);
  }, []);

  /* ── Start/stop when mode changes ───────────────────────────────────── */
  useEffect(() => {
    if (voiceActive && SpeechRecognition) {
      startSession();
    } else {
      stopAll();
    }
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceActive]);

  /* ── Context value ───────────────────────────────────────────────────── */
  const value = useMemo(() => ({
    navListening,
    pendingDangerous,
    registerActions,
    navSpeak,
    pauseNavForInput,
    resumeNavAfterInput,
  }), [navListening, pendingDangerous, registerActions, navSpeak, pauseNavForInput, resumeNavAfterInput]);

  return (
    <VoiceNavContext.Provider value={value}>
      {children}

      {/* ── Voice nav status badge ──────────────────────────────────── */}
      {voiceActive && (
        <div
          role="status"
          aria-label={navListening ? "Voice navigation: listening" : "Voice navigation: ready"}
          style={{
            position: "fixed", bottom: "1rem", right: "1rem", zIndex: 9000,
            display: "flex", alignItems: "center", gap: "0.4rem",
            background: navListening
              ? "rgba(16,185,129,0.18)"
              : "rgba(60,60,60,0.12)",
            border: `1px solid ${navListening ? "var(--color-success)" : "var(--color-border)"}`,
            borderRadius: "var(--radius)",
            padding: "0.35rem 0.75rem",
            fontSize: "0.75rem",
            color: navListening ? "var(--color-success-text)" : "var(--color-text-muted)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: navListening ? "var(--color-success)" : "var(--color-text-dim)",
              animation: navListening ? "pulse-border 1.5s infinite" : "none",
            }}
          />
          {navListening ? "🎤 Listening…" : "Voice nav ready"}
        </div>
      )}

      {/* ── Logout confirmation dialog ──────────────────────────────── */}
      {pendingDangerous && (
        <div
          role="alertdialog"
          aria-labelledby="voice-confirm-title"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, zIndex: 9500,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
          }}
        >
          <div
            className="card"
            style={{ maxWidth: "400px", padding: "2rem", textAlign: "center" }}
          >
            <h2 id="voice-confirm-title" style={{ marginTop: 0 }}>
              Confirm Log Out
            </h2>
            <p style={{ marginBottom: "1.25rem" }}>
              Are you sure you want to log out?
            </p>
            <div className="flex gap-2" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-danger"
                autoFocus
                onClick={() => {
                  navSpeak("Logging out. Goodbye.");
                  pendingDangerousRef.current = null;
                  setPendingDangerous(null);
                  setTimeout(() => logoutRef.current(), 1400);
                }}
              >
                Yes, log out
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navSpeak("Logout cancelled.");
                  pendingDangerousRef.current = null;
                  setPendingDangerous(null);
                }}
              >
                No, cancel
              </button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "1rem" }}>
              Or say <strong>yes</strong> or <strong>no</strong>
            </p>
          </div>
        </div>
      )}
    </VoiceNavContext.Provider>
  );
}

export function useVoiceNav() {
  const ctx = useContext(VoiceNavContext);
  if (!ctx) throw new Error("useVoiceNav must be used inside <VoiceNavProvider>.");
  return ctx;
}
