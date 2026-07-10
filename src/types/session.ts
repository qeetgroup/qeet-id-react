/** One of the current user's active sessions, from `GET /v1/auth/sessions`. */
export interface Session {
  id: string;
  current?: boolean;
  [key: string]: unknown;
}

/** One of the current user's registered passkeys, from `GET /v1/passkeys`. */
export interface Passkey {
  id: string;
  name?: string;
  [key: string]: unknown;
}
