/**
 * Client-side pre-submit UX checks for the embedded sign-in/sign-up forms —
 * catches obvious mistakes before a round trip, not a security boundary.
 * The backend re-validates everything regardless.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** A conservative floor for pre-submit UX only — the backend enforces its own policy regardless (see `authPolicy` on the server SDK). */
export const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
