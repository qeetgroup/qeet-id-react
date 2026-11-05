/**
 * The session contract: what `@qeet-id/react` in the browser and the app's own
 * server agree on. `@qeet-id/nextjs` and `@qeet-id/tanstack` implement the
 * server side; docs/session-contract.md describes it in full.
 *
 * Import it as `@qeet-id/react/contract`. It has no React import and no
 * `"use client"`, so it is safe in Server Components, route handlers,
 * middleware and any server runtime.
 *
 * @packageDocumentation
 */

/** Where the session routes live unless the app passes another `basePath`. */
export const DEFAULT_BASE_PATH = "/auth";

/**
 * Each session route's name under the base path.
 *
 * | Route | Method | Called by | Answers |
 * | --- | --- | --- | --- |
 * | `sign-in` | GET (page navigation) | the browser | `302` to Qeet ID's authorization endpoint |
 * | `sign-up` | GET (page navigation) | the browser | `302` to Qeet ID's authorization endpoint |
 * | `callback` | GET (page navigation) | Qeet ID's redirect | `302` to the saved return path |
 * | `session` | GET (`fetch`) | the browser | `200` `SessionResponse` |
 * | `sign-out` | POST (`fetch`) | the browser | `200` `SignOutResponse` |
 * | `switch-organization` | POST (`fetch`) | the browser | `200` `SwitchOrganizationResponse` |
 */
export const SESSION_ROUTES = {
  signIn: "sign-in",
  signUp: "sign-up",
  callback: "callback",
  session: "session",
  signOut: "sign-out",
  switchOrganization: "switch-organization",
} as const;

/** The name of a session route, as a key of `SESSION_ROUTES`. */
export type SessionRouteName = keyof typeof SESSION_ROUTES;

/** Every session route's absolute path, from `sessionRoutes`. */
export type SessionRoutes = Readonly<Record<SessionRouteName, string>>;

/** The query parameters `sign-in` and `sign-up` read. */
export const SIGN_IN_PARAMETERS = {
  /** A same-origin path to come back to after signing in. */
  returnTo: "returnTo",
  /** The id of the organisation to sign in to. */
  organization: "organization",
  /** The email address to prefill on the hosted sign-in page. */
  loginHint: "loginHint",
} as const;

/**
 * The query parameter the server adds to the return path when a sign-in
 * failed at the callback, carrying a `SignInErrorCode`. The browser SDK reads
 * it once, reports it and removes it from the address bar.
 */
export const AUTH_ERROR_PARAMETER = "authError";

/**
 * The header the browser sends on every session-route request, set to
 * `CSRF_HEADER_VALUE`. The server refuses a POST without it (`403
 * csrf_rejected`): a page on another site can't add a custom header to a
 * cross-origin request without a CORS preflight, which the session routes
 * never allow (RFC 10017 §6.1.3.3.2).
 */
export const CSRF_HEADER = "X-Qeet-ID-Request";

/** The value of `CSRF_HEADER`. */
export const CSRF_HEADER_VALUE = "1";

/** The longest return path accepted, in characters. */
export const MAX_RETURN_TO_LENGTH = 2048;

/**
 * The session the app's server reports to the browser. Every field comes from
 * what Qeet ID gives the application: the ID token, `GET /v1/oauth/userinfo`
 * and, with the app's API key, the management API (see each field). It never
 * carries a token: the access, ID and refresh tokens stay on the server.
 *
 * `roles` and `permissions` are for showing and hiding UI. They are hints,
 * never a security decision: the server checks again on every request.
 */
export interface Session {
  /** The person who signed in. */
  readonly user: SessionUser;
  /** The organisation the session is in (the `tenant_id` claim), or `null` when it is in none. */
  readonly organization: SessionOrganization | null;
  /**
   * The names of the roles the person holds in `organization`, such as
   * `"Finance approver"`. Empty when the server doesn't look them up.
   */
  readonly roles: readonly string[];
  /**
   * The permission keys the person holds in `organization`, such as
   * `"invoice.approve"`. Empty when the server doesn't look them up.
   */
  readonly permissions: readonly string[];
  /**
   * When this session ends unless the server renews it, as an ISO 8601
   * date-time in UTC, such as `"2026-11-05T21:30:00.000Z"`.
   */
  readonly expiresAt: string;
}

/** The signed-in person, from the OpenID Connect standard claims. */
export interface SessionUser {
  /** Their Qeet ID user id: the `sub` claim. */
  readonly id: string;
  /** Their email address (`email`), or `null` when the `email` scope wasn't granted. */
  readonly email: string | null;
  /** Whether Qeet ID has verified `email` (`email_verified`); `false` when `email` is `null`. */
  readonly emailVerified: boolean;
  /** Their display name (`name`), or `null` when they have none or the `profile` scope wasn't granted. */
  readonly name: string | null;
  /** The URL of their profile picture (`picture`), or `null` when they have none or the `profile` scope wasn't granted. */
  readonly picture: string | null;
}

/** An organisation (a Qeet ID tenant). */
export interface SessionOrganization {
  /** The organisation's id: the `tenant_id` claim. */
  readonly id: string;
  /** Its name, or `null` when the server doesn't look it up. */
  readonly name: string | null;
}

/** The body of `GET {basePath}/session`: always `200`, with `null` when nobody is signed in. */
export interface SessionResponse {
  readonly session: Session | null;
}

/** The optional JSON body of `POST {basePath}/sign-out`. */
export interface SignOutRequest {
  /** A path on this site to end up on after signing out. The server checks it with `safeReturnTo`. */
  readonly returnTo?: string;
}

/** The body of a successful `POST {basePath}/sign-out`: where the browser goes next. */
export interface SignOutResponse {
  /** An `https:` or `http:` URL (usually Qeet ID's sign-out endpoint), or a path on this site. */
  readonly redirectTo: string;
}

/** The JSON body of `POST {basePath}/switch-organization`. */
export interface SwitchOrganizationRequest {
  /** The id of the organisation to switch to. */
  readonly organizationId: string;
}

/** The body of a successful `POST {basePath}/switch-organization`: the session, now in the new organisation. */
export interface SwitchOrganizationResponse {
  readonly session: Session;
}

/**
 * The error codes a session route answers with.
 *
 * | Code | Status | When |
 * | --- | --- | --- |
 * | `invalid_request` | 400 | a body that isn't the route's JSON |
 * | `not_signed_in` | 401 | switching organisation without a session |
 * | `csrf_rejected` | 403 | a POST without `X-Qeet-ID-Request: 1`, or from another site |
 * | `organization_switch_refused` | 403 | the person can't enter that organisation |
 * | `method_not_allowed` | 405 | a route called with the wrong method |
 * | `organization_switch_unavailable` | 501 | Qeet ID can't switch this application's organisation |
 * | `session_unavailable` | 503 | the server couldn't reach Qeet ID to confirm or renew the session |
 * | `internal_error` | 500 | anything else |
 */
export type SessionErrorCode =
  | "invalid_request"
  | "not_signed_in"
  | "csrf_rejected"
  | "organization_switch_refused"
  | "method_not_allowed"
  | "organization_switch_unavailable"
  | "session_unavailable"
  | "internal_error";

/** The body of a session route's error answer (any non-2xx status). */
export interface ErrorResponse {
  readonly error: {
    /** A stable code: a `SessionErrorCode`, or one a newer server added. */
    readonly code: SessionErrorCode | (string & {});
    /** A message for developers. Never shown to people as is. */
    readonly message: string;
  };
}

/**
 * Why a sign-in failed at the callback, carried by `AUTH_ERROR_PARAMETER`.
 * OAuth's own codes come from Qeet ID's authorization response (RFC 6749
 * §4.1.2.1); the rest are the server's.
 *
 * | Code | When |
 * | --- | --- |
 * | `access_denied` | the person declined, or the organisation refused them (address rules, a second factor not met) |
 * | `login_required` · `interaction_required` · `consent_required` | a silent sign-in needed the person |
 * | `invalid_request` · `invalid_scope` · `unauthorized_client` | the application is misconfigured |
 * | `server_error` · `temporarily_unavailable` | Qeet ID failed |
 * | `invalid_state` | the callback didn't match a sign-in this browser started (state, nonce or PKCE) |
 * | `session_unavailable` | the code couldn't be exchanged |
 */
export type SignInErrorCode =
  | "access_denied"
  | "login_required"
  | "interaction_required"
  | "consent_required"
  | "invalid_request"
  | "invalid_scope"
  | "unauthorized_client"
  | "server_error"
  | "temporarily_unavailable"
  | "invalid_state"
  | "session_unavailable";

/**
 * The absolute path of every session route under `basePath`, which must be a
 * path on the app's own site: `sessionRoutes("/auth").session` is
 * `"/auth/session"`.
 *
 * @throws {TypeError} when `basePath` doesn't start with exactly one `/`, or has a query, fragment, backslash, whitespace or control character.
 */
export function sessionRoutes(basePath: string = DEFAULT_BASE_PATH): SessionRoutes {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what this refuses
  if (typeof basePath !== "string" || !/^\/(?!\/)[^?#\\\s\u0000-\u001f\u007f]*$/.test(basePath)) {
    throw new TypeError(`basePath must be a path on this site, such as "${DEFAULT_BASE_PATH}"; got ${JSON.stringify(basePath)}.`);
  }
  const base = basePath.replace(/\/+$/, "");
  return Object.freeze({
    signIn: `${base}/${SESSION_ROUTES.signIn}`,
    signUp: `${base}/${SESSION_ROUTES.signUp}`,
    callback: `${base}/${SESSION_ROUTES.callback}`,
    session: `${base}/${SESSION_ROUTES.session}`,
    signOut: `${base}/${SESSION_ROUTES.signOut}`,
    switchOrganization: `${base}/${SESSION_ROUTES.switchOrganization}`,
  });
}

/**
 * Returns `value` as a path on `origin` (path, query and fragment) when it is
 * one, and `undefined` otherwise. Redirect to the result, never to the input:
 * this is what keeps the session routes from being an open redirect.
 *
 * Accepts a path such as `/invoices?status=due`, or an absolute URL on the same
 * origin, reduced to its path. Refuses another origin, `//host` and `/\host`,
 * schemes such as `javascript:`, credentials in the URL, backslashes, control
 * characters, and anything longer than `MAX_RETURN_TO_LENGTH`.
 *
 * ```ts
 * safeReturnTo("/invoices", "https://app.brightleaffoods.in");            // "/invoices"
 * safeReturnTo("https://evil.example/", "https://app.brightleaffoods.in"); // undefined
 * ```
 *
 * @param value The return path a request carried, if any.
 * @param origin The app's own origin, such as `https://app.brightleaffoods.in`.
 */
export function safeReturnTo(value: unknown, origin: string): string | undefined {
  if (typeof value !== "string" || value === "" || value.length > MAX_RETURN_TO_LENGTH) return undefined;
  // Browsers read "\" as "/" in http(s) URLs, so "/\evil.example" would be "//evil.example".
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what this refuses
  if (/[\\\u0000-\u001f\u007f]/.test(value) || value.startsWith("//")) return undefined;
  let base: URL;
  let target: URL;
  try {
    base = new URL(origin);
    target = new URL(value, base);
  } catch {
    return undefined;
  }
  if (target.origin !== base.origin || target.username !== "" || target.password !== "") return undefined;
  const path = `${target.pathname}${target.search}${target.hash}`;
  // "/.//evil.example" normalises to the path "//evil.example", another host to a browser.
  return path.startsWith("/") && !path.startsWith("//") ? path : undefined;
}

/**
 * Checks that `value` is a `Session` as this contract defines it and returns
 * it, frozen. Fields this version doesn't know are dropped; a nullable field
 * that is missing becomes `null`, so an older server still fits.
 *
 * @throws {TypeError} naming the first field that doesn't fit.
 */
export function parseSession(value: unknown): Session {
  const session = record(value, "session");
  const user = record(session.user, "session.user");
  const organization = session.organization ?? null;
  return Object.freeze({
    user: Object.freeze({
      id: text(user.id, "session.user.id"),
      email: nullableText(user.email, "session.user.email"),
      emailVerified: user.emailVerified === undefined ? false : flag(user.emailVerified, "session.user.emailVerified"),
      name: nullableText(user.name, "session.user.name"),
      picture: nullableText(user.picture, "session.user.picture"),
    }),
    organization:
      organization === null
        ? null
        : Object.freeze({
            id: text(record(organization, "session.organization").id, "session.organization.id"),
            name: nullableText((organization as Record<string, unknown>).name, "session.organization.name"),
          }),
    roles: texts(session.roles, "session.roles"),
    permissions: texts(session.permissions, "session.permissions"),
    expiresAt: instant(session.expiresAt, "session.expiresAt"),
  });
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value === "") throw new TypeError(`${field} must be a non-empty string.`);
  return value;
}

function nullableText(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string or null.`);
  return value;
}

function flag(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${field} must be a boolean.`);
  return value;
}

function texts(value: unknown, field: string): readonly string[] {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new TypeError(`${field} must be an array of strings.`);
  }
  return Object.freeze([...value]);
}

function instant(value: unknown, field: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new TypeError(`${field} must be an ISO 8601 date-time.`);
  return value;
}
