# Repository Context — qeet-id-react

**Level:** L2 · **Status:** active · **Evidence state:** verified · **Last verified:** 2026-08-28
**Verification scope:** exports, provider modes, transport and CSRF behaviour, CI jobs and test
setup read from source. Publication status checked against the npm registry.

## Identity

`@qeet-id/react` v0.1.0 — React hooks, components and prebuilt widgets for Qeet ID. React 18 or 19
peer, Node ≥18.17, pnpm, **zero runtime dependencies**, built by Vite in library mode with
`vite-plugin-dts` (`rollupTypes: true`).

**Status: `development`. Not published — npm returns 404**, no release tag, and **no version export
at all** (there is no `src/version.ts`) even though `SECURITY.md` asks reporters for the SDK version.

## Context inheritance

```text
qeet-context (L0)  →  qeet-id-context (L1)  →  qeet-id-server (the contract)
                                            →  qeet-id-react (L2 — this document)
```

## What makes this SDK different

> **It is a browser client, not a management SDK.**

| | `qeet-id-go` / `qeet-id-node` | **this repository** |
|---|---|---|
| Auth | `Authorization: ApiKey <qk_...>` | **cookie + CSRF double-submit** |
| Sees a token? | yes | **never** — session is HttpOnly |
| Base URL | defaults to `https://api.id.qeet.in` | **required, no default** |
| Retry / timeout / logger | yes | **none** |
| Pagination | yes | **none** |
| JWKS / webhook verification | yes | **none** |

Every one of those absences is deliberate. A browser must not hold a server credential, and a
component library has no business retrying a user-initiated request behind their back.

## Responsibilities

Rendering authentication UI and exposing React state for it: sign-in/up flows, passkey ceremonies,
MFA, session state, user and organization reads, and six prebuilt widgets.

## Non-responsibilities

Authorization decisions · tenant scoping · token issuance or storage · admin/management operations ·
the API contract. All belong to `qeet-id-server`.

## The two provider modes — ADR-0001

```text
<QeetIDProvider>                          redirect mode
   no apiUrl  →  client = null
   SignInButton/SignUpButton/SignOutButton navigate to loginUrl/signUpUrl/logoutUrl
   flow hooks + widgets THROW "requires apiUrl on <QeetIDProvider>"

<QeetIDProvider apiUrl="https://api.id.qeet.in">      embedded mode
   new QeetIDClient({ apiUrl })
   hooks and <SignIn/>/<SignUp/> drive the API directly
```

`useAuth`, `useUser`, `<SignedIn>`, `<SignedOut>` work in **both** modes — they read `initialState`
and never need `apiUrl`.

**Evidence:** `src/client/provider.tsx`, `docs/design-decisions/ADR-0001-two-provider-modes.md`

## Transport and CSRF

**Evidence:** `src/client/http.ts`, `src/constants/auth.ts`

Every request sets `credentials: "include"`. Mutations read the `qe_csrf` cookie and echo it as
`X-CSRF-Token`; if the cookie is absent the client fires a best-effort `GET /healthz` to seed it.
GET requests send no CSRF header.

This mirrors `qeet-id-login` exactly — the same cookie-based contract with the same backend.

**There is no resilience layer**: raw `fetch`, no retry, no timeout, no response cap.

## Errors

| Class | Use |
|---|---|
| `AuthenticationError` | API failures — `status`, `code`, `message`, `requestId`, with **getters** (`get isUnauthorized()`) |
| `WebAuthnError` | `reason: "unsupported" \| "cancelled" \| "failed"` — unique to this SDK |

Node uses **methods** (`isUnauthorized()`); Go uses methods on a pointer. Same envelope, three
shapes. There is deliberately **no `AuthorizationError`** — ADR-0002.

## Deliberate API gaps — ADR-0002

Not missing. **Refused**, because the backend has no session-authenticated endpoint for them:

- no `usePermission`, no `useRole`
- no `useUsers`, no `useOrganizations` admin listings
- no `AuthorizationError`

Only the API-key management API can resolve those, and a browser must never hold an API key.
**Adding one of these hooks would mean inventing an endpoint.**

## Field casing — a deliberate contradiction with the Node SDK

`src/client/client.ts` maps snake_case API responses into camelCase domain types
(`r.client_name` → `clientName`, `r.branding.logo_url` → `logoUrl`).

**`qeet-id-node`'s ADR-0004 does the exact opposite** — it keeps wire fields snake_case verbatim.
Same organization, opposite decisions, each correct for its consumer. Do not harmonise them.

## Conventions

- **`"use client"` on every hook and JSX file** — required for RSC consumers.
- **Three sanctioned hook shapes**: context-read · flow-with-`status`-union ·
  data-fetching-with-`isLoaded`. Do not invent a fourth.
- **One component per file, named after its export**; `Button` suffix retained (ADR-0003),
  deliberately mirroring Clerk's surface so the SDK is familiar.
- Widgets take `appearance`, applied via `applyAppearance` and `--qeetid-*` CSS variables.

## Testing

4 test files + `test/setup.ts`; vitest with `environment: "jsdom"`, `globals: false`,
`@testing-library/react` + `jest-dom`. ~28 `it()` blocks across `client`, `components`, `hooks`,
`provider`. **No mock-server helper** — unlike the Node SDK's `test/helpers/mock-transport.ts`.

## CI/CD

`ci.yml` (Node 18.17/20/22/24) runs install, typecheck, **lint**, build, `test:coverage`.
**`qeet-id-node`'s `ci.yml` omits lint; this one includes it** — a parity gap between sibling repos.
`lint.yml`, `security.yml` (audit + gitleaks), `codeql.yml`, `release.yml` (tag `v*` → npm publish).

## Security-critical areas

| Area | Path | Risk | Review |
|---|---|---|---|
| WebAuthn ceremonies | `src/client/webauthn.ts` | **Critical** | Security review |
| CSRF handling | `src/client/http.ts` | **Critical** | Security review |
| Preference storage | `src/utils/storage.ts` | High | **Never store a credential here** |

`SECURITY.md` is explicit that this SDK **never has access to the session token** (HttpOnly), so
realistic findings are CSRF, DOM injection, or WebAuthn correctness — not token theft.

## Known constraints

- **`apiUrl` has no default** — embedded mode fails closed if the integrator omits it.
- **No version export**, contradicting `SECURITY.md`'s reporting instructions.
- No retry/timeout — a flaky network surfaces directly to the user, by design.
- Not published; contract changes are currently free.
- The camelCase mapping means this SDK's types are **not** interchangeable with the Node SDK's.

## Documentation authority

Source > tests > `CONTRIBUTING.md` > README. The **API contract** is owned by `qeet-id-server`.
