import { AuthenticationError } from "../errors/AuthenticationError.js";
import type {
  SignInParams,
  SignInResult,
  SignUpParams,
  SignUpResult,
  MfaChallenge,
  MfaEnrollment,
  VerifyMfaParams,
  VerifyMfaResult,
  ForgotPasswordParams,
  ResetPasswordParams,
  MagicLinkStartParams,
  SocialStartParams,
} from "../types/auth.js";
import type { Branding, LoginContext } from "../types/common.js";
import type { Organization } from "../types/organization.js";
import type { QeetIDUser } from "../types/user.js";
import type { Session, Passkey } from "../types/session.js";
import { Http } from "./http.js";
import { createCredential, getAssertion, getConditionalAssertion, isConditionalMediationAvailable } from "./webauthn.js";

// The server keeps a passkey ceremony for five minutes; an autofill ceremony is
// renewed a little before that.
const AUTOFILL_RENEW_AFTER_MS = 4.5 * 60 * 1000;

export interface QeetIDClientOptions {
  /** Base URL of the Qeet ID API, e.g. "https://api.id.qeet.in". */
  apiUrl: string;
}

// Backend response shapes (snake_case) this client maps from.
interface SessionResponse {
  user_id?: string;
  mfa_required?: boolean;
  mfa_token?: string;
  methods?: string[];
  enrollment_required?: boolean;
  enrollment_due_at?: string;
}

// The challenge a sign-in or registration answered with, if any.
function challengeOf(r: SessionResponse): MfaChallenge | null {
  if (!r.mfa_required || !r.mfa_token) return null;
  const challenge: MfaChallenge = { status: "needs_mfa", mfaToken: r.mfa_token, methods: r.methods ?? [] };
  if (r.enrollment_required) challenge.enrollmentRequired = true;
  if (r.enrollment_due_at) challenge.enrollmentDueAt = r.enrollment_due_at;
  return challenge;
}
interface PasskeyResponse {
  id: string;
  name?: string | null;
  transports?: string[] | null;
  last_used_at?: string | null;
  created_at: string;
}
interface PrincipalResponse {
  user_id?: string | null;
  tenant_id?: string | null;
  session_id?: string | null;
}
interface ProfileResponse {
  id: string;
  email: string;
  email_verified_at?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  status?: string;
}
interface OrganizationResponse {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  region?: string;
  logo_url?: string;
  domain?: string;
  roles?: string[] | null;
  last_used_at?: string | null;
}
interface OrganizationPageResponse {
  items?: OrganizationResponse[] | null;
  next_cursor?: string | null;
}

function toOrganization(o: OrganizationResponse): Organization {
  const org: Organization = { id: o.id, name: o.name, roles: o.roles ?? [], lastUsedAt: o.last_used_at ?? null };
  if (o.slug) org.slug = o.slug;
  if (o.plan) org.plan = o.plan;
  if (o.region) org.region = o.region;
  if (o.logo_url) org.logoUrl = o.logo_url;
  if (o.domain) org.domain = o.domain;
  return org;
}
interface LoginContextResponse {
  client_name?: string;
  tenant_id?: string;
  providers?: string[];
  self_registration_enabled?: boolean;
  remember_device_enabled?: boolean;
  branding?: { logo_url?: string; primary_color?: string; secondary_color?: string } | null;
}

/**
 * The browser-side client for the Qeet ID auth flows. It is cookie-based
 * (the backend sets the HttpOnly SSO cookie), framework-agnostic, and has
 * zero runtime dependencies — it's what `<QeetIDProvider>`'s embedded mode
 * and every hook in this package call through.
 */
export class QeetIDClient {
  private readonly http: Http;
  readonly passkeys: PasskeysResource;
  readonly magicLink: MagicLinkResource;
  readonly sessions: SessionsResource;

  constructor(opts: QeetIDClientOptions) {
    this.http = new Http(opts.apiUrl);
    this.passkeys = new PasskeysResource(this.http);
    this.magicLink = new MagicLinkResource(this.http);
    this.sessions = new SessionsResource(this.http);
  }

  /** Fetches the hosted-login UI context (client name, providers, branding) for an OAuth client_id. Returns sensible empty defaults when the id is unknown. */
  async loginContext(clientId: string): Promise<LoginContext> {
    const r = await this.http.get<LoginContextResponse>(`/v1/oauth/login-context?client_id=${encodeURIComponent(clientId)}`);
    const branding: Branding | undefined = r.branding
      ? { logoUrl: r.branding.logo_url, primaryColor: r.branding.primary_color, secondaryColor: r.branding.secondary_color }
      : undefined;
    return {
      clientName: r.client_name ?? "",
      tenantId: r.tenant_id ?? "",
      providers: r.providers ?? [],
      selfRegistrationEnabled: r.self_registration_enabled ?? false,
      rememberDeviceEnabled: r.remember_device_enabled ?? false,
      branding,
    };
  }

  /**
   * Password sign-in. Establishes the session cookie, or reports that a second
   * factor is required (pass the returned mfaToken to `verifyMfa`) — or, with
   * `enrollmentRequired`, must be set up first (`startMfaEnrollment`).
   */
  async signIn({ email, password }: SignInParams): Promise<SignInResult> {
    const r = await this.http.post<SessionResponse>("/v1/auth/session", { email, password });
    return challengeOf(r) ?? { status: "complete", userId: r.user_id };
  }

  /**
   * Completes a pending second-factor challenge with a code (authenticator
   * app or recovery code), establishing the session cookie. For a challenge
   * that set up an authenticator app, returns the account's new recovery
   * codes — show them once.
   */
  async verifyMfa({ mfaToken, code, remember }: VerifyMfaParams): Promise<VerifyMfaResult> {
    const r = await this.http.post<{ recovery_codes?: string[] } | null>("/v1/auth/session/mfa", {
      mfa_token: mfaToken,
      code,
      remember: remember ?? false,
    });
    return { recoveryCodes: r?.recovery_codes ?? [] };
  }

  /** Starts the authenticator app that completes an enrolment challenge (`enrollmentRequired`); confirm it with `verifyMfa` and a code from the app. */
  async startMfaEnrollment(mfaToken: string): Promise<MfaEnrollment> {
    const r = await this.http.post<{ secret: string; provisioning_url: string }>("/v1/auth/mfa/enroll", { mfa_token: mfaToken });
    return { secret: r.secret, provisioningUrl: r.provisioning_url };
  }

  /** Puts setting up a second factor off while the organisation's grace period runs (`enrollmentDueAt`), establishing the session cookie without one. */
  async skipMfaEnrollment(mfaToken: string): Promise<void> {
    await this.http.post("/v1/auth/session/mfa", { mfa_token: mfaToken, skip: true });
  }

  /**
   * Tenant-scoped self-registration; establishes the session cookie on
   * success — or, where the organisation requires MFA, answers an enrolment
   * challenge to complete first.
   */
  async signUp({ tenantId, email, password, displayName }: SignUpParams): Promise<SignUpResult> {
    const r = await this.http.post<SessionResponse | null>("/v1/auth/register", {
      tenant_id: tenantId,
      email,
      password,
      display_name: displayName,
    });
    return (r && challengeOf(r)) ?? { status: "complete" };
  }

  /** Signs the current user out (clears the session server-side). */
  async signOut(): Promise<void> {
    await this.http.post("/v1/auth/logout");
  }

  /** Starts a password-reset flow (enumeration-safe; tenantId optional). */
  async forgotPassword({ email, tenantId }: ForgotPasswordParams): Promise<void> {
    const body: Record<string, string> = { email };
    if (tenantId) body.tenant_id = tenantId;
    await this.http.post("/v1/auth/forgot-password", body);
  }

  /** Completes a password reset with the emailed token. */
  async resetPassword({ token, newPassword }: ResetPasswordParams): Promise<void> {
    await this.http.post("/v1/auth/reset-password", { token, new_password: newPassword });
  }

  /**
   * The signed-in user, or null when there's no session: the session's
   * identifiers (`GET /v1/auth/me`) merged with the profile (`GET /v1/me`).
   */
  async currentUser(): Promise<QeetIDUser | null> {
    let me: PrincipalResponse;
    let profile: ProfileResponse;
    try {
      [me, profile] = await Promise.all([this.http.get<PrincipalResponse>("/v1/auth/me"), this.http.get<ProfileResponse>("/v1/me")]);
    } catch (e) {
      if (e instanceof AuthenticationError && e.isUnauthorized) return null;
      throw e;
    }
    const user: QeetIDUser = { id: profile.id, sub: profile.id, email: profile.email, emailVerified: profile.email_verified_at != null };
    const tenantId = me.tenant_id ?? undefined;
    if (tenantId) user.tenantId = tenantId;
    if (me.session_id) user.sessionId = me.session_id;
    if (profile.display_name) user.displayName = profile.display_name;
    if (profile.avatar_url) user.avatarUrl = profile.avatar_url;
    if (profile.phone) user.phone = profile.phone;
    if (profile.status) user.status = profile.status;
    return user;
  }

  /** Every organisation the signed-in user belongs to, by name (`GET /v1/me/organizations`, all pages). */
  async listOrganizations(): Promise<Organization[]> {
    const out: Organization[] = [];
    let cursor = "";
    do {
      const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const page = await this.http.get<OrganizationPageResponse>(`/v1/me/organizations${q}`);
      for (const o of page.items ?? []) out.push(toOrganization(o));
      cursor = page.next_cursor ?? "";
    } while (cursor);
    return out;
  }

  /** Switches the active tenant for the current principal. */
  async switchTenant(tenantId: string): Promise<void> {
    await this.http.post("/v1/auth/switch-tenant", { tenant_id: tenantId });
  }

  /** Full-page redirect URL that starts a social (OAuth) sign-in. */
  socialStartUrl({ provider, tenantId, returnTo }: SocialStartParams): string {
    const q = new URLSearchParams({ tenant_id: tenantId, return_to: returnTo });
    return this.http.url(`/v1/social/${encodeURIComponent(provider)}/start?${q.toString()}`);
  }
}

// Begin responses for the WebAuthn ceremonies carry a session_id + JSON options.
interface PasskeyBegin {
  session_id: string;
  publicKey: unknown;
}

function toPasskey(p: PasskeyResponse): Passkey {
  return {
    id: p.id,
    name: p.name ?? null,
    transports: p.transports ?? [],
    lastUsedAt: p.last_used_at ?? null,
    createdAt: p.created_at,
  };
}

class PasskeysResource {
  constructor(private readonly http: Http) {}

  /** Passwordless passkey sign-in: begins the ceremony, prompts the authenticator, and finishes — establishing the session cookie. */
  async login(): Promise<void> {
    const begin = await this.http.post<PasskeyBegin>("/v1/passkeys/login/begin", {});
    const credential = await getAssertion(begin.publicKey);
    await this.http.post("/v1/passkeys/login/finish", { session_id: begin.session_id, credential });
  }

  /**
   * Passkey sign-in from the browser's autofill prompt. Starts a discoverable
   * ceremony with conditional mediation — attach it to a sign-in form whose
   * email field has autocomplete="username webauthn" — and resolves true once
   * the passkey the user picked has signed in (session cookie set), or false
   * when the browser lacks conditional mediation, no passkey was picked, or
   * signal aborted it (abort it before signing in another way). The ceremony
   * is renewed before its server state expires. A picked passkey the server
   * refuses rejects with its AuthenticationError.
   */
  async autofill(signal: AbortSignal): Promise<boolean> {
    if (!(await isConditionalMediationAvailable())) return false;
    while (!signal.aborted) {
      const renew = new AbortController();
      const timer = setTimeout(() => renew.abort(), AUTOFILL_RENEW_AFTER_MS);
      const stop = () => renew.abort();
      signal.addEventListener("abort", stop, { once: true });
      try {
        const begin = await this.http.post<PasskeyBegin>("/v1/passkeys/login/begin", {});
        const credential = await getConditionalAssertion(begin.publicKey, renew.signal);
        if (credential === null) {
          if (signal.aborted || !renew.signal.aborted) return false;
          continue; // renewed: start a fresh ceremony
        }
        try {
          await this.http.post("/v1/passkeys/login/finish", { session_id: begin.session_id, credential });
          return true;
        } catch (err) {
          // The ceremony state ran out while the prompt was open: start again.
          if (err instanceof AuthenticationError && err.code === "auth.session_expired") continue;
          throw err;
        }
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", stop);
      }
    }
    return false;
  }

  /**
   * Enrolls a new passkey for the signed-in user, named `options.name` when
   * given. Without a name the server names it after this browser (e.g. "Chrome
   * on macOS"); change it with `rename`. Works with the hosted-login session
   * cookie; like every mutation here, both steps send the CSRF token. Refused
   * (403 `passkey.disabled`) when the user's organization has passkeys off.
   */
  async register(options?: { name?: string }): Promise<void> {
    const begin = await this.http.post<PasskeyBegin>("/v1/passkeys/register/begin", {});
    const credential = await createCredential(begin.publicKey);
    const name = options?.name?.trim();
    await this.http.post("/v1/passkeys/register/finish", { session_id: begin.session_id, credential, ...(name ? { name } : {}) });
  }

  /** Lists the signed-in user's registered passkeys, newest first. */
  async list(): Promise<Passkey[]> {
    const r = await this.http.get<{ items?: PasskeyResponse[] }>("/v1/passkeys");
    return (r.items ?? []).map(toPasskey);
  }

  /**
   * Renames one of the user's passkeys. The server trims the name and refuses
   * (422) one that is empty or longer than 64 characters; another user's
   * passkey is not found (404).
   */
  async rename(id: string, name: string): Promise<Passkey> {
    return toPasskey(await this.http.patch<PasskeyResponse>(`/v1/passkeys/${encodeURIComponent(id)}`, { name }));
  }

  /** Deletes one of the user's passkeys. Needs a bearer token: the hosted-login session cookie is not accepted for removal. */
  delete(id: string): Promise<void> {
    return this.http.del(`/v1/passkeys/${encodeURIComponent(id)}`);
  }
}

class MagicLinkResource {
  constructor(private readonly http: Http) {}

  /** Sends a passwordless magic link to the given email. */
  async start({ email, tenantId }: MagicLinkStartParams): Promise<void> {
    const body: Record<string, string> = { email };
    if (tenantId) body.tenant_id = tenantId;
    await this.http.post("/v1/auth/magic-link/start", body);
  }

  /**
   * Consumes a magic-link token. When the account holds a second factor, or
   * must have one, it reports the challenge (`needs_mfa`) instead — complete it
   * with `verifyMfa`, or set one up with `startMfaEnrollment`. The link is spent
   * either way.
   */
  async consume(token: string): Promise<SignInResult> {
    const r = await this.http.post<SessionResponse | null>("/v1/auth/magic-link/consume", { token });
    return (r && challengeOf(r)) ?? { status: "complete", userId: r?.user_id };
  }
}

class SessionsResource {
  constructor(private readonly http: Http) {}

  /** Lists the current user's sessions (the first page, newest first), the one this request is made with marked `current`. */
  async list(): Promise<Session[]> {
    const r = await this.http.get<{ items?: Session[] }>("/v1/auth/sessions");
    return r.items ?? [];
  }

  /** Revokes a session by id. */
  revoke(id: string): Promise<void> {
    return this.http.del(`/v1/auth/sessions/${encodeURIComponent(id)}`);
  }
}
