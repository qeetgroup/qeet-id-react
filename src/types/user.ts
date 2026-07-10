/**
 * The signed-in user's profile. `/v1/auth/me` on the real backend today only
 * returns session-principal claims (`user_id`, `tenant_id`, `session_id`,
 * `actor`, `scopes`) — no `email`/`displayName` yet. Those two fields are
 * kept here (optional) because the hosted-login app's own UI already
 * expects them and a richer `/auth/me` is the likely near-term direction;
 * the index signature keeps this forward-compatible either way.
 */
export interface QeetIDUser {
  id?: string;
  sub?: string;
  email?: string;
  displayName?: string;
  tenantId?: string;
  [key: string]: unknown;
}
