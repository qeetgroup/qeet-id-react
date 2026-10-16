/** One of the current user's active sessions, from `GET /v1/auth/sessions`. */
export interface Session {
  id: string;
  /** True for the session this request was made with. */
  current?: boolean;
  /** The device and browser in words, e.g. "Chrome on macOS". */
  device?: string;
  device_kind?: "desktop" | "mobile" | "tablet" | "unknown";
  /** Where the session was opened (ISO 3166-1 alpha-2), when the deployment knows. */
  country?: string;
  /** "active", "revoked" or "expired". */
  status?: string;
  [key: string]: unknown;
}

/** One of the current user's registered passkeys, from `GET /v1/passkeys`. */
export interface Passkey {
  id: string;
  /**
   * User-supplied text: render it as text, never as HTML. New passkeys are
   * named by the server (after the enrolling browser, e.g. "Chrome on macOS");
   * one enrolled before that can be `null` until it is renamed.
   */
  name: string | null;
  /** WebAuthn transport hints, e.g. "internal", "hybrid", "usb". */
  transports: string[];
  /** ISO 8601 timestamp, or null if the passkey has never been used to sign in. */
  lastUsedAt: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
}
