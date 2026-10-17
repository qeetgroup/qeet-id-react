# Changelog

All notable changes to the Qeet ID React SDK are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Setting up a second factor during sign-in and sign-up, for an organisation
  that requires MFA. When the account has no second factor, `signIn`/`signUp`
  answer a `needs_mfa` challenge with `enrollmentRequired` (and
  `enrollmentDueAt` during the organisation's grace period).
  `client.startMfaEnrollment` starts an authenticator app; `verifyMfa` with a
  code from it completes the challenge and now returns `{ recoveryCodes }` —
  the account's new recovery codes, shown once; `client.skipMfaEnrollment`
  puts the setup off while the grace period runs. `useSignIn`/`useSignUp` add
  the `needs_mfa_enrollment` and `recovery_codes` steps with
  `startEnrollment`, `skipEnrollment` and `finish`, and `<SignIn/>`/`<SignUp/>`
  render them.

### Changed

- `client.verifyMfa` returns `{ recoveryCodes }`, `client.signUp` a
  `SignUpResult` and `client.magicLink.consume` a `SignInResult` instead of
  `void`; callers that ignore the result are unaffected. A magic link for an
  account that holds a second factor, or must have one, now answers a
  `needs_mfa` challenge rather than signing in.

## [0.1.0] — 2026-07-10

Initial release.

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
[docs/design-decisions/ADR-0002](docs/design-decisions/ADR-0002-no-fictional-endpoints.md)
and [docs/FUTURE.md](docs/FUTURE.md).

[0.1.0]: https://github.com/qeetgroup/qeet-id-react/releases/tag/v0.1.0
