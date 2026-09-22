/**
 * useVoices — returns the list of available browser speech synthesis voices.
 *
 * The browser voice list is populated asynchronously; on Chrome it fires a
 * `voiceschanged` event.  This hook handles both the synchronous case
 * (Firefox, Safari) and the async case (Chrome, Edge) so the Settings page
 * always has an up-to-date list.
 */
import { useEffect, useState } from "react";

export function useVoices() {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [voices, setVoices] = useState(() => {
    if (!supported) return [];
    return window.speechSynthesis.getVoices();
  });

  useEffect(() => {
    if (!supported) return;

    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };

    // Already available synchronously (Firefox, Safari).
    load();

    // Chrome fires voiceschanged once the list is ready.
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, [supported]);

  // Return only English voices first, then everything else, so the list is
  // short and relevant by default.
  const sorted = [
    ...voices.filter((v) => v.lang.startsWith("en")),
    ...voices.filter((v) => !v.lang.startsWith("en")),
  ];

  return { voices: sorted, supported };
}
