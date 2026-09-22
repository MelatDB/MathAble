/**
 * Centralised screen-reader announcement system.
 *
 * Two ARIA live regions are maintained:
 *  - polite   — for informational updates that do not interrupt the user
 *  - assertive — for urgent alerts (errors, validation failures)
 *
 * Usage:
 *   const { announce } = useAnnouncement();
 *   announce("Solution ready. Press Read Solution to listen.");
 *   announce("Email address is required.", true);   // assertive
 *
 * Rules applied here:
 *  - Identical consecutive messages are re-announced by briefly clearing
 *    the region first (screen readers ignore duplicate text).
 *  - Announcements auto-clear after 8 seconds so stale text is not
 *    picked up when focus moves to the region.
 *  - Never announce every visible piece of text — only meaningful events.
 */
import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from "react";

const AnnouncementContext = createContext(null);

const CLEAR_DELAY = 8000; // ms before auto-clearing the live region

export function AnnouncementProvider({ children }) {
  const [polite,    setPolite]    = useState("");
  const [assertive, setAssertive] = useState("");
  const politeTimer    = useRef(null);
  const assertiveTimer = useRef(null);

  const announce = useCallback((message, urgent = false) => {
    if (!message || !message.trim()) return;

    if (urgent) {
      // Clear → set on next frame so repeated identical messages re-fire.
      if (assertiveTimer.current) clearTimeout(assertiveTimer.current);
      setAssertive("");
      requestAnimationFrame(() => {
        setAssertive(message);
        assertiveTimer.current = setTimeout(() => setAssertive(""), CLEAR_DELAY);
      });
    } else {
      if (politeTimer.current) clearTimeout(politeTimer.current);
      setPolite("");
      requestAnimationFrame(() => {
        setPolite(message);
        politeTimer.current = setTimeout(() => setPolite(""), CLEAR_DELAY);
      });
    }
  }, []);

  const value = useMemo(
    () => ({ polite, assertive, announce }),
    [polite, assertive, announce],
  );

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncement() {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) throw new Error("useAnnouncement must be used inside <AnnouncementProvider>.");
  return ctx;
}
