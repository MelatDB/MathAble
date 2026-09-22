/**
 * Theme wrapper.
 *
 * Applies the current text-size and contrast preference as CSS classes on a
 * wrapping element so the whole view reflects the student's accessibility
 * profile without re-rendering the tree.
 */
import { useEffect } from "react";

import { useAccessibility } from "../accessibility/AccessibilityContext";
import { useAnnouncement } from "../accessibility/AnnouncementContext";

const TEXT_SIZE_CLASS = {
  small: "text-small",
  medium: "text-medium",
  large: "text-large",
  "x-large": "text-x-large",
};

const CONTRAST_CLASS = {
  normal: "contrast-normal",
  high: "contrast-high",
};

export function ThemeWrapper({ children }) {
  const { settings } = useAccessibility();
  const { announce } = useAnnouncement();

  useEffect(() => {
    const root = document.documentElement;
    for (const cls of Object.values(TEXT_SIZE_CLASS)) root.classList.remove(cls);
    for (const cls of Object.values(CONTRAST_CLASS)) root.classList.remove(cls);
    if (settings.text_size) root.classList.add(TEXT_SIZE_CLASS[settings.text_size] || "text-medium");
    if (settings.contrast) root.classList.add(CONTRAST_CLASS[settings.contrast] || "");
  }, [settings.text_size, settings.contrast]);

  // Announce the applied theme once on mount so screen-reader users hear what
  // the app looks like without needing to infer it from the styles.
  useEffect(() => {
    announce(
      `View is using ${settings.text_size} text and ${settings.contrast} contrast.`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
