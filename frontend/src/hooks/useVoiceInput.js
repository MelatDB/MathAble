/**
 * useVoiceInput — Web Speech Recognition hook for mathematics dictation.
 *
 * Handles MATH EXPRESSION dictation only (e.g. "x squared plus five x plus six").
 * Navigation commands are handled separately by VoiceNavProvider.
 *
 * CONFLICT PREVENTION
 * ───────────────────
 * When math voice input starts, this hook pauses the voice navigation session
 * so both do not run simultaneously (browsers allow only one recognition
 * session per page).  The nav session resumes automatically when dictation ends.
 *
 * An optional `onNavPause` / `onNavResume` pair can be injected by the calling
 * component (obtained from useVoiceNav().pauseNavForInput / resumeNavAfterInput).
 * If not provided (keyboard-only mode) the calls are no-ops.
 *
 * Usage:
 *   const { pauseNavForInput, resumeNavAfterInput } = useVoiceNav();
 *   const { start, stop, listening, supported, error } = useVoiceInput({
 *     onResult,
 *     onNavPause: pauseNavForInput,
 *     onNavResume: resumeNavAfterInput,
 *   });
 */
import { useCallback, useRef, useState } from "react";
import { useAnnouncement } from "../accessibility/AnnouncementContext";

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export function useVoiceInput({ onResult, onNavPause, onNavResume }) {
  const { announce } = useAnnouncement();
  const [listening, setListening] = useState(false);
  const [error, setError]         = useState("");
  const recognitionRef            = useRef(null);

  const supported = Boolean(SpeechRecognition);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    announce("Listening stopped.");
    onNavResume?.();
  }, [announce, onNavResume]);

  const start = useCallback(() => {
    if (!supported) {
      const msg = "Voice input is not supported in this browser. Please type your expression instead.";
      setError(msg);
      announce(msg, true);
      return;
    }

    // Pause voice navigation so both sessions do not clash
    onNavPause?.();

    setError("");
    setListening(true);
    announce("Listening started. Speak your expression now.");

    const recognition = new SpeechRecognition();
    recognition.lang            = "en-US";
    recognition.continuous      = false;
    recognition.interimResults  = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current      = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      recognitionRef.current = null;
      announce(`I heard: ${transcript}. Please confirm or edit before solving.`);
      if (onResult) onResult(transcript);
      onNavResume?.();
    };

    recognition.onerror = (event) => {
      setListening(false);
      recognitionRef.current = null;
      let msg;
      if (event.error === "not-allowed") {
        msg = "Microphone permission was denied. Please allow microphone access in your browser settings and try again.";
      } else if (event.error === "no-speech") {
        msg = "No speech was detected. Please try again and speak clearly.";
      } else {
        msg = "Voice input could not be captured. Please try again or type your answer instead.";
      }
      setError(msg);
      announce(msg, true);
      onNavResume?.();
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      onNavResume?.();
    };

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      const msg = "Could not start voice input. Please try again.";
      setError(msg);
      announce(msg, true);
      onNavResume?.();
    }
  }, [supported, onResult, announce, onNavPause, onNavResume]);

  return { start, stop, listening, supported, error };
}
