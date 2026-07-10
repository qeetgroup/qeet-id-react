/**
 * The active organization (tenant). There is no session-scoped "list every
 * organization I belong to" endpoint on the real backend today — only the
 * single active tenant carried in the session (`/v1/auth/me`'s `tenant_id`)
 * plus `switchTenant`. `name` is therefore optional; multi-org UI degrades
 * to showing just the id until a real membership-list endpoint exists (see
 * docs/FUTURE.md).
 */
export interface Organization {
  id: string;
  name?: string;
}
