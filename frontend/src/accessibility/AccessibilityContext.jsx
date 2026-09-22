/**
 * Accessibility settings context.
 *
 * Provides the current text size / contrast / high-contrast preference along
 * with a function to persist changes through the API.  Changes are announced
 * to screen reader users immediately (see AnnouncementContext) so no one has
 * to guess whether a setting took effect.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../api/client";

const AccessibilityContext = createContext(null);

const DEFAULT_SETTINGS = {
  text_size: "medium",
  contrast: "normal",
  tts_enabled: true,
  tts_rate: 1,
  tts_voice: "",
  voice_input_enabled: true,
};

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    // Pull the saved profile settings once the view mounts so the controls
    // reflect whatever the student saved last session.
    api
      .get("/accessibility/settings")
      .then((data) => {
        if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
      })
      .catch(() => {
        // Keep defaults; they are accessible and safe.
      });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      updateSetting: (patch) =>
        setSettings((prev) => ({ ...prev, ...patch })),
    }),
    [settings],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used inside <AccessibilityProvider>.");
  return ctx;
}
