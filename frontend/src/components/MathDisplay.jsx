/**
 * MathDisplay — renders a MathML string with MathJax typesetting.
 *
 * The backend produces Presentation MathML for every expression.  Browsers
 * that support MathML natively (Firefox) render it without any JavaScript.
 * Chrome and Edge need MathJax to convert MathML into visual output.
 *
 * Accessibility:
 *  - MathJax preserves the underlying MathML in the DOM so screen readers
 *    that understand MathML (NVDA + MathPlayer, VoiceOver on macOS/iOS) can
 *    still read the structure.
 *  - The container has role="math" and aria-label set to the spoken form so
 *    screen readers that do NOT understand MathML still hear plain English.
 *  - If MathML is absent we fall back to the spoken text only.
 *
 * Props:
 *   mathml  — Presentation MathML string from the backend (may be empty)
 *   spoken  — plain-language description used as aria-label fallback
 *   inline  — render as inline element instead of block (default: false)
 */
import { useEffect, useRef } from "react";

export function MathDisplay({ mathml, spoken = "", inline = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!mathml || !containerRef.current) return;

    // Let MathJax typeset just this container, not the entire page.
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([containerRef.current]).catch(() => {
        // MathJax typeset failure is non-fatal; the raw MathML remains.
      });
    }
  }, [mathml]);

  if (!mathml) {
    // No MathML — render the spoken description as plain text.
    return spoken ? (
      <span className="math-spoken" aria-label={spoken}>
        {spoken}
      </span>
    ) : null;
  }

  const Tag = inline ? "span" : "div";

  return (
    <Tag
      ref={containerRef}
      role="math"
      aria-label={spoken || undefined}
      className={inline ? "math-inline" : "math-block"}
      // dangerouslySetInnerHTML is safe here because mathml comes from our
      // own SymPy backend, never from user-supplied free-form text.
      dangerouslySetInnerHTML={{ __html: mathml }}
    />
  );
}
