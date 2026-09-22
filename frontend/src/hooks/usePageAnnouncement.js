/**
 * usePageAnnouncement — announces page context when the user arrives.
 *
 * Called once on mount with a descriptive string so screen-reader users
 * immediately know where they are and what they can do.
 *
 * Example:
 *   usePageAnnouncement("Math Solver. Enter a mathematics problem or use voice input.");
 *   usePageAnnouncement(`Practice page. Topic: ${topic}. Question 1 of ${count}.`);
 *
 * The announcement is polite (does not interrupt) and fires after a short
 * delay to let the browser settle focus before speaking.
 */
import { useEffect } from "react";
import { useAnnouncement } from "../accessibility/AnnouncementContext";

export function usePageAnnouncement(message) {
  const { announce } = useAnnouncement();

  useEffect(() => {
    if (!message) return;
    // Small delay ensures the live region is in the DOM and focus has settled.
    const t = setTimeout(() => announce(message), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount — intentional empty deps
}
