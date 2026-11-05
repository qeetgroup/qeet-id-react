# Changelog

All notable changes to the Qeet ID React SDK are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-11-05

The first published version: a rebuild of the whole SDK for hosted login. People sign in, sign up, do
MFA and passkeys on Qeet ID's hosted pages; the app's own server keeps the tokens; this package
renders the session that server reports. The 0.1.0 draft below was never published, so these breaking
changes against it ship without a major version.

### Added

- **The session contract** between the browser and the app's server, as types and helpers in the new
  server-safe entry `@qeet-id/react/contract` and in
  [docs/session-contract.md](docs/session-contract.md): six routes under a configurable base path
  (default `/auth`: `sign-in`, `sign-up`, `callback`, `session`, `sign-out`, `switch-organization`),
  their JSON, the error envelope and codes, the `X-Qeet-ID-Request: 1` CSRF header, the same-origin
  return-path rule (`safeReturnTo`), `?authError=` for a failed sign-in, and `parseSession`. Every
  session field is traced to Qeet ID's ID token, userinfo or management API. `@qeet-id/nextjs` and
  `@qeet-id/tanstack` implement it.
- **`<QeetIDProvider>`** reads the session from `GET {basePath}/session`, or takes `initialSession`
  from a server render (no flicker, no hydration mismatch, no request). It checks again on focus (at
  most every five seconds), on reconnection and at `expiresAt`; tells other tabs about a sign-out or a
  switch over `BroadcastChannel`; reports a failed sign-in from the callback and removes it from the
  address bar; and calls `onSessionChange`, `onSignOut(reason)` and `onError`. Props: `basePath`,
  `refetchOnWindowFocus`, `refetchOnReconnect`, `syncTabs`, `localization`.
- **Session states**: `status` is `loading`, `signed-in`, `signed-out` or `unavailable` (the first
  check failed); `error`, `endReason` (`signed-out`, `expired`, `revoked`) and `pendingAction`
  (`sign-out`, `switch-organization`).
- **Hooks**: `useSession` (state, `has()` and every action), `useUser`, `useOrganization` (the
  organisation, roles, permissions, `has()`, switching) and `useQeetID` (the actions only, with stable
  identities). Each re-renders only when its own part of the session changes.
- **Components**: `<Protect>` (role, permission or condition, with `fallback`, `loading` and
  `redirectToSignIn`); `<UserButton>` (avatar with picture, initials and icon fallbacks; a menu with
  the name, email, the app's own items and Sign out); `<OrganizationSwitcher>` (radio items, live
  status, `afterSwitchUrl`, `onSwitch`). Both are WAI-ARIA APG menu buttons with full keyboard
  support, work right to left, and take `className`, `classNames` and `unstyled`.
- **`@qeet-id/react/styles.css`**, an optional stylesheet on `--qeet-id-*` custom properties that fall
  back to Qeetrix's `--qx-*` tokens and then to Qeet's defaults; light and dark; in `@layer qeet-id`.
- **`@qeet-id/react/testing`**: `QeetIDTestProvider` and `createTestSession`, to render the app's own
  components with any session and no server.
- **`QeetIDError`** with a stable `code` and `status`, and **`VERSION`**.
- Every string the components show or announce is in `localization`, with `{name}` and
  `{organization}` placeholders.
- **CommonJS** beside the ES module build, one file per module, with `"use client"` kept on exactly
  the modules that use hooks or context.

### Changed

- **Breaking:** React **18.3** or 19 is required (was 18.0), and `react` is the only peer dependency;
  `react-dom` is no longer one.
- **Breaking:** Node.js **22.12** or later to build and server-render (was 22).
- **Breaking:** `useSession` returns the session's state and actions (it listed and revoked the
  person's sessions). `useUser` returns `{ isLoaded, user }` from the session (it fetched the profile
  from Qeet ID). `useOrganization` returns the session's organisation, roles and permissions (it
  fetched the active tenant).
- **Breaking:** `<SignInButton>`, `<SignUpButton>` and `<SignOutButton>` go to the app's own
  `{basePath}/sign-in`, `/sign-up` and `POST /sign-out` (they went to `loginUrl`, `signUpUrl` and
  `logoutUrl`, or called the API). They take `returnTo` (and `organization` and `loginHint` for sign-in
  and sign-up), and give the click to the app's own button as the single child.
- **Breaking:** `<OrganizationSwitcher>` is a menu button that switches through the app's server and
  takes the list of organisations as `organizations` (it fetched them from Qeet ID).
- **Breaking:** `<UserButton>` takes `showName`, `menuItems` and `signOutReturnTo`; its menu no longer
  links to an embedded profile.
- **Breaking:** errors are one `QeetIDError` with `code` and `status` (was `AuthenticationError` and
  `WebAuthnError`).
- **Breaking:** the session's user has `id`, `email`, `emailVerified`, `name` and `picture`, from the
  OpenID Connect claims (was `QeetIDUser` with `displayName`, `avatarUrl`, `phone`, `status`, …).
- Built with tsdown and TypeScript 7 (was Vite library mode with API Extractor on TypeScript 6);
  `publint` and Are the Types Wrong are part of `bun run verify`.
- Every rendering test also runs on React 18.3; accessibility is checked with axe.
- Releases on merge into `main`: `version.yml` bumps the patch on the pull request, and `release.yml`
  publishes a version npm does not have yet, then tags it and opens a GitHub Release.

### Removed

- **Breaking:** the embedded flows and every direct call from the browser to Qeet ID:
  `<SignIn/>`, `<SignUp/>`, `<UserProfile/>`, `<OrganizationProfile/>`, `<CreateOrganization/>`,
  `<MfaEnrollmentPanel>`, `<SessionStatus>`; `useAuth`, `useSignIn`, `useSignUp`, `useSignOut`,
  `useMFA`, `usePasskeys`, `usePasskeyAutofill`, `useOrganizationList`; `QeetIDClient`,
  `useQeetIDClient`, `useQeetIDState`, `usePaths`, `useAppearance` and `isWebAuthnSupported`. Sign-in,
  sign-up, MFA, passkeys and account management happen on Qeet ID's hosted pages.
- **Breaking:** the two provider modes and their props (`apiUrl`, `loginUrl`, `logoutUrl`,
  `signUpUrl`, `initialState`, `appearance`); use `basePath` and `initialSession`.
- **Breaking:** `<RequireAuth>` (use `<Protect>`), `<Loading>`, `<Spinner>` and `<ErrorBoundary>`
  (use the app's own).
- **Breaking:** the appearance system (`Appearance`, `--qeetid-*` variables); use `className`,
  `classNames`, `unstyled` and `@qeet-id/react/styles.css` with `--qeet-id-*` properties.
- **Breaking:** the cookie and CSRF helpers and utilities: `CSRF_COOKIE_NAME`, `CSRF_HEADER_NAME`,
  `DEFAULT_LOGIN_URL`, `DEFAULT_LOGOUT_URL`, `DEFAULT_SIGNUP_URL`, `readCookie`,
  `getStoredPreference`, `setStoredPreference`, `describeSession`, `getQueryToken`, `isValidEmail`,
  `isValidPassword`, `MIN_PASSWORD_LENGTH`, `base64UrlDecode`, `base64UrlEncode`. The CSRF header is
  `CSRF_HEADER` in `@qeet-id/react/contract`.
- **Breaking:** the types of the removed flows (`SignInResult`, `SignUpResult`, `MfaChallenge`,
  `MfaEnrollment`, `Passkey`, `Branding`, `LoginContext`, the `*Params` and `*Status` types, …).

### Security

- The browser holds no token and calls nothing but the app's own routes (RFC 10017 §6.1).
- Every request carries the CSRF header; sign-out and switching are POST only.
- Return paths are same-origin only, and only `http(s)` URLs or paths are ever navigated to.
- No inline styles, scripts or `eval`, so a strict Content-Security-Policy needs no exception.
- Avatars load with `referrerPolicy="no-referrer"`.

## 0.1.0 draft — 2026-07-10 (never published)

The first draft.

### Added

**Provider**
- `<QeetIDProvider>` — two modes: redirect (no `apiUrl`, hooks/buttons
  navigate to your own hosted-login routes) and embedded (`apiUrl` set,
  hooks/forms drive auth directly against the API). `initialState` for
  SSR hydration. `appearance` for global theming.
- Zero third-party runtime dependencies beyond `react`/`react-dom` (peer
  dependencies, not bundled).

**Hooks — authentication**: `useAuth` (session identity), `useSession`
(list/revoke active sessions), `useSignIn` (email/password + MFA step),
`useSignUp` (registration), `useSignOut`, `usePasskeys` (WebAuthn
list/register/remove), `useMFA` (standalone step-up verification).

**Hooks — identity**: `useUser` (profile), `useOrganization` (active
tenant + switch), `useOrganizationList` (current user's own tenant
membership).

**Components**: `<SignedIn>`/`<SignedOut>`, `<SignInButton>`/
`<SignUpButton>`/`<SignOutButton>` (unstyled redirect triggers),
`<UserButton>` (avatar + dropdown menu), `<SessionStatus>` (active-sessions
list with revoke), `<RequireAuth>` (auth-gated rendering), `<Loading>`/
`<Spinner>`/`<ErrorBoundary>` (framework-agnostic UI primitives).

**Embedded forms** (full inline UI, not just triggers): `<SignIn/>`,
`<SignUp/>`, `<UserProfile/>` (profile + passkeys + sessions panel),
`<OrganizationSwitcher/>`, `<OrganizationProfile/>`, `<CreateOrganization/>`
(a UI shell — dispatches a `qeetid:create-organization` event since
creation itself is a server-SDK operation).

**Cross-cutting**
- Cookie-based auth (`credentials: "include"`) with automatic CSRF
  double-submit token handling — never touches the session token itself,
  which is an HttpOnly cookie by design.
- WebAuthn/passkey ceremonies via the browser's native
  `navigator.credentials` API, with `isWebAuthnSupported()` for
  feature-detection.
- Appearance system: `--qeetid-*` CSS variable overrides + per-element
  `className` overrides on every embedded form.
- Flow hooks (`useSignIn`, `useSignUp`, `useMFA`, `useSignOut`) never throw
  past their own boundary — every failure converts to `status.error` for
  UI to render from directly.

### Notes

This is a from-scratch repo port of the reference implementation already
shipping inside the `qeet-id` backend monorepo (`sdk/js/react` +
`sdk/js/client`), reorganized into category folders (matching the sibling
`@qeet-id/node` SDK's convention) and re-verified against the real backend
routes rather than assumed. Two categories of hooks/components described in
early drafts were deliberately **not** built —
`usePermission`/`usePermissions`/`useRole`/`useRoles`,
`RequirePermission`/`RequireRole`, and `useUsers`/`useOrganizations`
(plural, admin-listing) — because the real backend has no
session-authenticated endpoint to back them; see
the ADR of that time (since replaced) and docs/FUTURE.md.

[Unreleased]: https://github.com/qeetgroup/qeet-id-react/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/qeetgroup/qeet-id-react/releases/tag/v0.1.0
