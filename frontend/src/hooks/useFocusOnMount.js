/**
 * useFocusOnMount — moves focus to a ref'd element when a condition becomes true.
 *
 * Usage:
 *   const ref = useFocusOnMount(feedbackReady);
 *   <div ref={ref} tabIndex={-1}> … </div>
 *
 * This ensures screen-reader users land on the new content (feedback,
 * solution, error) without having to hunt for it.
 */
import { useEffect, useRef } from "react";

export function useFocusOnMount(condition) {
  const ref = useRef(null);

  useEffect(() => {
    if (condition && ref.current) {
      // Small delay so the element is rendered before focus moves.
      const t = setTimeout(() => ref.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [condition]);

  return ref;
}
