/**
 * Authentication context.
 *
 * - Saves the JWT to localStorage after login/register.
 * - On page load, validates any saved token with /users/me and restores
 *   the session so users stay logged in across page refreshes.
 * - Silently refreshes the token via POST /auth/refresh when it is older
 *   than 23 hours (the token lifetime is 24 hours), so active users are
 *   never logged out mid-session.
 * - Logs the user out cleanly when the token is expired or invalid.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { api, saveToken, clearToken, getToken } from "../api/client";

const AuthContext = createContext(null);

// Refresh the token when it is within this many milliseconds of a day old.
// 23 h in ms = 82_800_000
const REFRESH_AFTER_MS = 23 * 60 * 60 * 1000;
// Check every 30 minutes whether the token needs refreshing.
const REFRESH_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** Parse the `iat` (issued-at) claim from a JWT without verifying it. */
function tokenIssuedAt(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.iat ? payload.iat * 1000 : null; // convert seconds → ms
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const intervalRef = useRef(null);

  /** Silently ask the backend for a fresh token using the current one. */
  const silentRefresh = useCallback(async () => {
    try {
      const data = await api.post("/auth/refresh");
      saveToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } catch {
      // Refresh failed (token already expired or revoked) — log out.
      clearToken();
      setToken("");
      setUser(null);
    }
  }, []);

  /** Schedule a periodic refresh check. Called after a successful login. */
  const scheduleRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const saved = getToken();
      if (!saved) return;
      const iat = tokenIssuedAt(saved);
      if (iat === null) return;
      const age = Date.now() - iat;
      if (age >= REFRESH_AFTER_MS) {
        silentRefresh();
      }
    }, REFRESH_CHECK_INTERVAL_MS);
  }, [silentRefresh]);

  // On mount: restore session from localStorage, then schedule refresh.
  useEffect(() => {
    const saved = getToken();
    if (!saved) {
      setIsBootstrapping(false);
      return;
    }

    // If the saved token is already ≥23 h old, refresh immediately;
    // otherwise restore the profile and schedule future checks.
    const iat = tokenIssuedAt(saved);
    const age = iat !== null ? Date.now() - iat : 0;

    if (age >= REFRESH_AFTER_MS) {
      // Refresh first, which will also set user + token on success.
      setToken(saved); // needed for the bearer header in the refresh call
      silentRefresh().finally(() => {
        setIsBootstrapping(false);
        scheduleRefresh();
      });
    } else {
      setToken(saved);
      api
        .get("/users/me")
        .then((data) => {
          setUser(data);
          scheduleRefresh();
        })
        .catch(() => {
          clearToken();
          setToken("");
          setUser(null);
        })
        .finally(() => {
          setIsBootstrapping(false);
        });
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    saveToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    scheduleRefresh();
    return data.user;
  }, [scheduleRefresh]);

  const register = useCallback(async (name, email, password, role = "student", extraHeaders = {}) => {
    const data = await api.post("/auth/register", { name, email, password, role }, extraHeaders);
    saveToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    scheduleRefresh();
    return data.user;
  }, [scheduleRefresh]);

  const logout = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    clearToken();
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isBootstrapping, login, register, logout }),
    [user, token, isBootstrapping, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
