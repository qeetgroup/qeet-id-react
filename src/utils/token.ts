/**
 * Reads an ephemeral flow token (magic-link consume, password-reset) out of
 * the current URL's query string. These are one-time, short-lived tokens
 * emailed to the user — never the session token itself, which is an
 * HttpOnly cookie invisible to JS by design (see client/http.ts).
 */
export function getQueryToken(paramName: string = "token"): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(paramName);
}
