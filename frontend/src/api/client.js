/**
 * Thin fetch wrapper around the MathAble REST API.
 *
 * All calls go to the same origin and are proxied by Vite to the backend in
 * development, so nothing here needs to know the backend address.
 *
 * Every network failure is converted into a plain-language error so that raw
 * stack traces or connection errors never reach a screen reader user.
 */
const BASE = "/api";

let onUnauthorized = null; // set by the app to redirect to /login on 401

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function getToken() {
  try {
    return localStorage.getItem("mathable_token");
  } catch {
    return null;
  }
}

export { getToken };

export function saveToken(token) {
  try {
    localStorage.setItem("mathable_token", token);
  } catch {
    // private mode / no storage: keep in memory only
  }
}

export function clearToken() {
  try {
    localStorage.removeItem("mathable_token");
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || "Something went wrong. Please try again.");
    this.status = status;
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the MathAble server. Please check your connection and try again.",
    );
  }

  if (response.status === 401 && onUnauthorized && !path.startsWith("/auth/")) {
    onUnauthorized();
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail =
      data && typeof data.detail === "string"
        ? data.detail
        : `The server returned an error (${response.status}). Please try again.`;
    throw new ApiError(response.status, detail);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, extraHeaders = {}) =>
    request(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: extraHeaders,
    }),
  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};
