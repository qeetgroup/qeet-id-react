import { AuthenticationError } from "../errors/AuthenticationError.js";
import type { SignInParams, SignInResult, SignUpParams, VerifyMfaParams, ForgotPasswordParams, ResetPasswordParams, MagicLinkStartParams, SocialStartParams } from "../types/auth.js";
import type { Branding, LoginContext } from "../types/common.js";
import type { QeetIDUser } from "../types/user.js";
import type { Session, Passkey } from "../types/session.js";
import { Http } from "./http.js";
import { createCredential, getAssertion } from "./webauthn.js";

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

  /** Password sign-in. Establishes the session cookie, or reports that a second factor is required (pass the returned mfaToken to `verifyMfa`). */
  async signIn({ email, password }: SignInParams): Promise<SignInResult> {
    const r = await this.http.post<SessionResponse>("/v1/auth/session", { email, password });
    if (r.mfa_required && r.mfa_token) {
      return { status: "needs_mfa", mfaToken: r.mfa_token, methods: r.methods ?? [] };
    }
    return { status: "complete", userId: r.user_id };
  }

  /** Completes a pending second-factor challenge (TOTP or recovery code). */
  async verifyMfa({ mfaToken, code, remember }: VerifyMfaParams): Promise<void> {
    await this.http.post("/v1/auth/session/mfa", { mfa_token: mfaToken, code, remember: remember ?? false });
  }

  /** Tenant-scoped self-registration; establishes the session cookie on success. */
  async signUp({ tenantId, email, password, displayName }: SignUpParams): Promise<void> {
    await this.http.post("/v1/auth/register", { tenant_id: tenantId, email, password, display_name: displayName });
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

  /** The current signed-in user, or null when there's no session. */
  async currentUser(): Promise<QeetIDUser | null> {
    try {
      return await this.http.get<QeetIDUser>("/v1/auth/me");
    } catch (e) {
      if (e instanceof AuthenticationError && e.isUnauthorized) return null;
      throw e;
    }
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

class PasskeysResource {
  constructor(private readonly http: Http) {}

  /** Passwordless passkey sign-in: begins the ceremony, prompts the authenticator, and finishes — establishing the session cookie. */
  async login(): Promise<void> {
    const begin = await this.http.post<PasskeyBegin>("/v1/passkeys/login/begin", {});
    const credential = await getAssertion(begin.publicKey);
    await this.http.post("/v1/passkeys/login/finish", { session_id: begin.session_id, credential });
  }

  /** Enrolls a new passkey for the signed-in user. */
  async register(): Promise<void> {
    const begin = await this.http.post<PasskeyBegin>("/v1/passkeys/register/begin", {});
    const credential = await createCredential(begin.publicKey);
    await this.http.post("/v1/passkeys/register/finish", { session_id: begin.session_id, credential });
  }

  /** Lists the signed-in user's registered passkeys. */
  list(): Promise<Passkey[]> {
    return this.http.get<Passkey[]>("/v1/passkeys");
  }

  /** Deletes one of the user's passkeys. */
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

  /** Consumes a magic-link token, establishing the session cookie. */
  async consume(token: string): Promise<void> {
    await this.http.post("/v1/auth/magic-link/consume", { token });
  }
}

class SessionsResource {
  constructor(private readonly http: Http) {}

  /** Lists the current user's active sessions. */
  list(): Promise<Session[]> {
    return this.http.get<Session[]>("/v1/auth/sessions");
  }

  /** Revokes a session by id. */
  revoke(id: string): Promise<void> {
    return this.http.del(`/v1/auth/sessions/${encodeURIComponent(id)}`);
  }
}
