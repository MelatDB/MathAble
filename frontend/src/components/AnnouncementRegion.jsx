/**
 * AnnouncementRegion — renders two ARIA live regions.
 *
 * - polite    → informational updates (solution ready, question loaded, etc.)
 * - assertive → urgent alerts (errors, validation failures)
 *
 * Both are visually hidden (sr-only) but always present in the DOM so
 * screen readers track them from page load.
 */
import { useAnnouncement } from "../accessibility/AnnouncementContext";

export function AnnouncementRegion() {
  const { polite, assertive } = useAnnouncement();

  return (
    <>
      {/* Polite: does not interrupt current speech */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
      >
        {polite}
      </div>

      {/* Assertive: interrupts current speech immediately */}
      <div
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertive}
      </div>
    </>
  );
}
