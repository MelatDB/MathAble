/**
 * useVoiceGuide — speaks a page introduction when voice navigation is active.
 *
 * Called once on page mount with:
 *   intro   — what this page is
 *   actions — what the user can do here (voice commands + key actions)
 *
 * Speaks when EITHER:
 *   - voice navigation mode is active (voice or combined), OR
 *   - tts_enabled is true in accessibility settings
 *
 * A blind user using voice navigation needs this read aloud regardless of
 * whether they explicitly enabled TTS in settings.
 *
 * Previous speech is cancelled so the new page description is heard immediately.
 */
import { useEffect } from "react";
import { useNavigation } from "../navigation/NavigationContext";
import { useAccessibility } from "../accessibility/AccessibilityContext";

export function useVoiceGuide({ intro, actions }) {
  const { voiceActive } = useNavigation();
  const { settings }    = useAccessibility();

  useEffect(() => {
    // Speak if voice nav is active OR if TTS is explicitly enabled
    const shouldSpeak = voiceActive || settings.tts_enabled;
    if (!shouldSpeak) return;
    if (!("speechSynthesis" in window)) return;

    const fullScript = [intro, actions].filter(Boolean).join("  ");
    if (!fullScript.trim()) return;

    // Small delay to let the page render and previous page's speech end,
    // then cancel any leftover speech and start the new page intro.
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
  // Only run on mount — page context doesn't change mid-page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
