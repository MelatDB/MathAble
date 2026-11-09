/**
 * useVoiceGuide — speaks a page introduction when voice navigation is active.
 *
 * ONLY speaks automatically when:
 *   - Navigation mode is "voice" or "combined" (voiceActive = true)
 *
 * In keyboard-only mode this hook does nothing — the page guide is silent.
 * TTS buttons on individual pages still work manually regardless of this hook.
 *
 * This separation is intentional: a keyboard user who has TTS enabled should
 * be able to press a button to hear content, but should NOT have every page
 * automatically read aloud when they navigate.
 */
import { useEffect } from "react";
import { useNavigation } from "../navigation/NavigationContext";
import { useAccessibility } from "../accessibility/AccessibilityContext";

export function useVoiceGuide({ intro, actions }) {
  const { voiceActive } = useNavigation();
  const { settings }    = useAccessibility();

  useEffect(() => {
    // Only auto-speak in voice navigation mode
    if (!voiceActive) return;
    if (!("speechSynthesis" in window)) return;

    const fullScript = [intro, actions].filter(Boolean).join("  ");
    if (!fullScript.trim()) return;

    const t = setTimeout(() => {
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(fullScript);
      u.lang = "en-US";
      u.rate = (settings.tts_rate || 10) / 10;

      if (settings.tts_voice) {
        const voices = window.speechSynthesis.getVoices();
        const match  = voices.find((v) => v.name === settings.tts_voice);
        if (match) u.voice = match;
      }

      window.speechSynthesis.speak(u);
    }, 300);

    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
