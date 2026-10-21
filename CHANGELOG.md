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

- **Requires Node.js 22 or later** for tooling (was 18.17). Node 18 and 20
  are end-of-life, and the test toolchain no longer runs on them; CI tests on
  Node 22, 24 and 26. The React peer range is unchanged.
- **Built with bun and Biome.** bun replaces pnpm (`bun.lock`,
  `packageManager: bun@1.4.3`), and Biome replaces ESLint and Prettier for
  linting and formatting (`biome.json`, with the rules of hooks and the
  console's accessibility checks). `bun run verify` is the gate: typecheck,
  Biome check, tests and build. Publishing still uses npm, for provenance.
  Every dev dependency is on its latest release (Vite 8, vitest 5, jsdom 30,
  vite-plugin-dts 5, @vitejs/plugin-react 6, @testing-library/jest-dom 7,
  @types/node 26, React 19.3 for the tests). TypeScript is pinned to 6:
  the declaration bundle (API Extractor) can't read TypeScript 7.
  `<OrganizationSwitcher/>`'s menu is a list of buttons with `aria-current`
  on the active organization, not a listbox of options that couldn't take
  focus.
- `useUser` reads the signed-in user's profile in embedded mode:
  `client.currentUser()` merges the session's ids (`GET /v1/auth/me`) with
  the profile (`GET /v1/me`), so `email`, `displayName`, `avatarUrl`,
  `emailVerified`, `phone` and `status` are filled. Before, it returned the
  raw `/v1/auth/me` body (snake_case ids, no profile), and `useUser` never
  called the API at all. `useOrganizationList` lists every organization the
  user belongs to, by name (new `client.listOrganizations()`,
  `GET /v1/me/organizations`), and `<OrganizationSwitcher/>` shows the names;
  it showed one bare id. A failed switch is shown in the switcher instead of
  rejecting unhandled. Needs the API release where the hosted-login cookie
  reaches those three reads.
- **Breaking:** `<CreateOrganization/>` requires `onCreate(name)` and awaits
  it, showing its error in the form; it no longer dispatches the
  `qeetid:create-organization` DOM event. Creating an organization needs the
  user's access token, so the app's server does it.
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
