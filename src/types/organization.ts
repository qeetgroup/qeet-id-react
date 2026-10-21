/**
 * An organisation (tenant) the signed-in user belongs to, as
 * `GET /v1/me/organizations` lists it. Only `id` is certain: in redirect
 * mode, and for the active organisation before the list loads, the SDK
 * knows just the session's tenant id.
 */
export interface Organization {
  id: string;
  name?: string;
  slug?: string;
  plan?: string;
  region?: string;
  logoUrl?: string;
  domain?: string;
  /** The user's role names in this organisation. */
  roles?: string[];
  /** When the user last chose it, not counting the current session. */
  lastUsedAt?: string | null;
}
