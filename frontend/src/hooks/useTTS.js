/**
 * useTTS — Web Speech API text-to-speech hook.
 *
 * Reads text aloud using the browser's built-in speech synthesis.
 * Respects the student's tts_enabled and tts_rate accessibility settings.
 *
 * Usage:
 *   const { speak, stop, speaking } = useTTS();
 *   speak("x squared plus five x plus six equals zero");
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccessibility } from "../accessibility/AccessibilityContext";

export function useTTS() {
  const { settings } = useAccessibility();
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Stop any ongoing speech when the hook unmounts.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [supported]);

  const speak = useCallback(
    (text) => {
      if (!supported) return;
      if (!settings.tts_enabled) return;
      if (!text || !text.trim()) return;

      // Cancel any current speech before starting a new one.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      // tts_rate is stored x10 (10 = 1.0x, 15 = 1.5x, etc.)
      utterance.rate = (settings.tts_rate || 10) / 10;
      utterance.lang = "en-US";

      // Optionally match the saved voice by name.
      if (settings.tts_voice) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.name === settings.tts_voice);
        if (match) utterance.voice = match;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, settings.tts_enabled, settings.tts_rate, settings.tts_voice],
  );

  return { speak, stop, speaking, supported };
}
