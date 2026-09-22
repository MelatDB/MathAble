/**
 * useVoiceDictation — captures a single spoken phrase to fill a form field.
 *
 * Different from useVoiceInput (math dictation) and VoiceNavProvider (navigation).
 * This hook is for general form field dictation: names, emails, answers, etc.
 *
 * It pauses voice navigation while recording, then resumes it.
 *
 * Usage:
 *   const { dictate, listening, error } = useVoiceDictation({
 *     onResult: (text) => setFieldValue(text),
 *     onNavPause, onNavResume,
 *   });
 */
import { useCallback, useRef, useState } from "react";
import { useAnnouncement } from "../accessibility/AnnouncementContext";

const SR = typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export function useVoiceDictation({ onResult, onNavPause, onNavResume }) {
  const { announce } = useAnnouncement();
  const [listening, setListening] = useState(false);
  const [error, setError]         = useState("");
  const recRef                    = useRef(null);

  const supported = Boolean(SR);

  const stop = useCallback(() => {
    if (recRef.current) {
      recRef.current.abort();
      recRef.current = null;
    }
    setListening(false);
    onNavResume?.();
  }, [onNavResume]);

  const dictate = useCallback((fieldLabel = "field") => {
    if (!supported) {
      const msg = "Voice input is not supported in this browser.";
      setError(msg); announce(msg, true); return;
    }
    onNavPause?.();
    setError(""); setListening(true);
    announce(`Listening for ${fieldLabel}. Speak now.`);

    const r = new SR();
    r.lang = "en-US"; r.continuous = false;
    r.interimResults = false; r.maxAlternatives = 1;
    recRef.current = r;

    r.onresult = (e) => {
      const t = e.results[0][0].transcript.trim();
      recRef.current = null; setListening(false);
      announce(`I heard: ${t}`);
      onResult?.(t);
      onNavResume?.();
    };
    r.onerror = (e) => {
      recRef.current = null; setListening(false);
      const msg = e.error === "not-allowed"
        ? "Microphone permission denied."
        : e.error === "no-speech"
        ? "No speech detected. Please try again."
        : "Could not capture speech. Please try again.";
      setError(msg); announce(msg, true);
      onNavResume?.();
    };
    r.onend = () => { recRef.current = null; setListening(false); onNavResume?.(); };

    try { r.start(); } catch {
      recRef.current = null; setListening(false);
      const msg = "Could not start voice input.";
      setError(msg); announce(msg, true); onNavResume?.();
    }
  }, [supported, onResult, announce, onNavPause, onNavResume]);

  return { dictate, stop, listening, supported, error };
}
