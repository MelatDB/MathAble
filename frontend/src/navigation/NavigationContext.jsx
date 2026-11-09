/**
 * NavigationContext — stores and exposes the user's preferred navigation mode.
 *
 * Modes:
 *   "voice"    — Voice Navigation (default for new users)
 *   "keyboard" — Keyboard Navigation only
 *   "combined" — Voice + Keyboard (both active simultaneously)
 *
 * The preference is saved in localStorage so it survives page refresh and
 * logout/login without requiring a backend round-trip.  The backend
 * accessibility settings table does not need a new column for this because
 * the preference is purely frontend/browser-side.
 *
 * First-time users get a welcome announcement and are invited to choose.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";

export const NAV_MODES = {
  VOICE:    "voice",
  KEYBOARD: "keyboard",
  COMBINED: "combined",
};

const STORAGE_KEY  = "mathable_nav_mode";
const FIRST_RUN_KEY = "mathable_nav_first_run";

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [navMode, setNavModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || NAV_MODES.VOICE;
    } catch {
      return NAV_MODES.VOICE;
    }
  });

  const [isFirstRun, setIsFirstRun] = useState(() => {
    try {
      return !localStorage.getItem(FIRST_RUN_KEY);
    } catch {
      return false;
    }
  });

  const setNavMode = useCallback((mode) => {
    setNavModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch { /* ignore */ }
    // Stop any ongoing speech when switching to keyboard-only mode
    if (mode === NAV_MODES.KEYBOARD && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const dismissFirstRun = useCallback(() => {
    setIsFirstRun(false);
    try {
      localStorage.setItem(FIRST_RUN_KEY, "1");
    } catch { /* ignore */ }
  }, []);

  // Derived booleans for easy consumption
  const voiceActive    = navMode === NAV_MODES.VOICE    || navMode === NAV_MODES.COMBINED;
  const keyboardActive = navMode === NAV_MODES.KEYBOARD || navMode === NAV_MODES.COMBINED;

  const value = useMemo(
    () => ({ navMode, setNavMode, voiceActive, keyboardActive, isFirstRun, dismissFirstRun }),
    [navMode, setNavMode, voiceActive, keyboardActive, isFirstRun, dismissFirstRun],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used inside <NavigationProvider>.");
  return ctx;
}
