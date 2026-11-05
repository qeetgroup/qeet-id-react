# Boundaries — qeet-id-react

**Level:** L2 · **Last verified:** 2026-11-05
**Verification scope:** ownership from ADR-0001; Qeet ID facts from `qeet-id-server`
(`fix/server-release-1.0`).

## Owns

- The session contract between the browser and the app's server (`src/contract.ts`,
  `docs/session-contract.md`). The server SDKs implement it; changing it changes them.
- The React provider, hooks and components, the optional stylesheet and the testing entry.

## Does not own

| Not owned | Owner |
| :-- | :-- |
| Sign-in, sign-up, MFA, passkeys, consent, account pages | Qeet ID's hosted pages (`qeet-id-login`) |
| Tokens, the code exchange, renewal, the session cookie | the app's server: `qeet-id-nextjs`, `qeet-id-tanstack` |
| Users, roles, organisations, permissions management | `qeet-id-node` (API key, server only) |
| What claims a token carries | `qeet-id-server` |
| The design system | Qeetrix — this SDK does **not** depend on it; its stylesheet only falls back to `--qx-*` |
| Organisation / product standards | `qeet-context` (L0) / `qeet-id-context` (L1) |

## Consumes

The app's own routes under `basePath`, same origin, with `X-Qeet-ID-Request: 1`. **Nothing else: no
Qeet ID endpoint, no token, no API key, no storage.**

## Provides

`@qeet-id/react`, `@qeet-id/react/contract`, `@qeet-id/react/testing`, `@qeet-id/react/styles.css`.

## Differences from the other SDKs — do not harmonise

| | `qeet-id-react` | `qeet-id-node` |
| :-- | :-- | :-- |
| Runs in | the browser (and server rendering) | a server |
| Talks to | the app's own routes | `api.id.qeet.in` |
| Credential | none: an HttpOnly cookie it can't read | an API key |
| JSON casing | camelCase (its own contract) | snake_case (Qeet ID's wire, ADR-0004 there) |
| Retries, timeouts, pagination | none (ADR-0005) | yes |
| Errors | one `QeetIDError` with `code` | a class per status |

## Gaps in Qeet ID it works around

| Gap | Effect here |
| :-- | :-- |
| An application's token can't call `/v1/me/organizations` or `/v1/auth/switch-tenant` (`internal/bootstrap/router.go:266`, `:440`) | the app passes `<OrganizationSwitcher organizations>`; switching answers `501` until Qeet ID supports it |
| An application's code is always for its own organisation (`internal/federation/oidc/authorize.go:95`) | `signIn({ organization })` is reserved |
| `/v1/oauth/authorize` takes no login or sign-up hint | `loginHint` and the `sign-up` route are reserved |
