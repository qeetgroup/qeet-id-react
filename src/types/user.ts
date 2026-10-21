/**
 * The signed-in user. In embedded mode `client.currentUser()` fills it from
 * two calls: the session identifiers from `GET /v1/auth/me` and the profile
 * from `GET /v1/me`. In redirect mode it is whatever `initialState.user` the
 * app passes in, so every field is optional; the index signature keeps extra
 * claims an app adds (`picture`, …) readable.
 */
export interface QeetIDUser {
  id?: string;
  sub?: string;
  /** The active organisation (tenant) of the session. */
  tenantId?: string;
  sessionId?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  /** "active", "suspended", … as the API reports it. */
  status?: string;
  [key: string]: unknown;
}
