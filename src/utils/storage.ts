/**
 * A thin `localStorage` wrapper for non-sensitive UI convenience state only
 * (e.g. "last used sign-in method" for a "continue with…" shortcut).
 *
 * Never store the session token or any credential here — the session is an
 * HttpOnly cookie specifically so JS (and therefore localStorage, and
 * therefore XSS) can never read it. Storing a copy of it here would defeat
 * that protection.
 */
export function getStoredPreference(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`qeetid.${key}`);
  } catch {
    return null;
  }
}

export function setStoredPreference(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`qeetid.${key}`, value);
  } catch {
    // Storage may be unavailable (private browsing, quota) — a UI
    // convenience preference silently not persisting isn't worth throwing.
  }
}
