# Boundaries — qeet-id-react

**Level:** L2 · **Last verified:** 2026-08-28
**Verification scope:** ownership from `qeet-id-context/REPOSITORIES.md`; cross-SDK differences
verified by reading all three SDKs.

## Owns

React bindings for Qeet ID authentication UI: 10 hooks, 11 components, 6 widgets, the two provider
modes, WebAuthn ceremony orchestration, and the cookie/CSRF browser transport.

## Does not own

| Not owned | Owner |
|---|---|
| **The API contract** | `qeet-id-server` — see its OpenAPI documents |
| Authorization, tenancy, token issuance | `qeet-id-server` |
| **The session token** | The browser's HttpOnly cookie — this SDK cannot read it |
| Management/admin operations | `qeet-id-node`, `qeet-id-go` |
| The hosted login UI | `qeet-id-login` |
| The design system | `qeetrix-ui` — this SDK does **not** consume it |
| Organization / product standards | `qeet-context` (L0) / `qeet-id-context` (L1) |

## Consumes

`api.id.qeet.in` from the browser with `credentials: "include"` and a CSRF double-submit header.
**No API key. No token. No storage of either.**

## Provides

An npm package with a public barrel (`src/index.ts`) and a peer dependency on React 18/19. Once
published, every exported hook, component and widget is a semver contract.

## Security boundaries

| Boundary | Enforcement |
|---|---|
| Session | **HttpOnly cookie** — outside this SDK entirely, by design |
| CSRF | `src/client/http.ts` — `qe_csrf` cookie echoed as `X-CSRF-Token` on mutations |
| WebAuthn | `src/client/webauthn.ts` — ceremony correctness |
| Preferences | `src/utils/storage.ts` — **non-sensitive only, never a credential** |

**This SDK is not a trust boundary and cannot be one.** It runs in a hostile environment (the user's
browser) with no secret. Everything it does is UX; the backend enforces.

## Cross-SDK differences — read before "harmonising" anything

| Concern | React | Node | Go |
|---|---|---|---|
| Auth | **cookie + CSRF** | `ApiKey` header | `ApiKey` header |
| Sees a token | **never** | yes | yes |
| Base URL default | **none — required** | `https://api.id.qeet.in` | same |
| Error predicates | **getters** | methods | methods |
| Error classes | `AuthenticationError`, `WebAuthnError` | 4 classes | 1 type |
| Wire casing | **camelCase mapped** | snake_case kept (ADR-0004) | as-is |
| Retry / timeout / logger | **none** | yes | yes |
| Pagination | **none** | async generator | `iter.Seq2` |
| JWKS / webhook verification | **none** | yes | yes |
| Version export | **none** | `VERSION` | `qeetid.Version` |
| Client type name | `QeetIDClient` | `QeetID` | `Client` |
| `ci.yml` runs lint | **yes** | **no** | via `lint.yml` |

The casing row is a genuine contradiction with `qeet-id-node`'s ADR-0004 — deliberate on both sides,
because their consumers differ. **Do not reconcile them.**

## What this SDK refuses to provide — ADR-0002

Not gaps. **Refusals**, because the backend has no session-authenticated endpoint:

- `usePermission`, `useRole`
- `useUsers`, `useOrganizations` admin listings
- `AuthorizationError`

Resolving those needs the API-key management API, and a browser must not hold an API key.
**Adding one of these would mean inventing an endpoint** — the thing `CONTRIBUTING.md` forbids.

## Safe to change without coordination

Internal refactoring behind an unchanged export · adding a test · a bug fix preserving signatures ·
styling through `appearance` · doc comments · a **new** component or widget built on existing hooks.

## Requires coordination

| Change | Why |
|---|---|
| **Any name in `src/index.ts`** | The package's public contract |
| The two-mode behaviour | ADR-0001; integrators depend on redirect mode working without `apiUrl` |
| CSRF cookie or header name | Must match `qeet-id-server` **and** `qeet-id-login` |
| Session cookie assumptions | Must match `qeet-id-server` |
| React peer range | Affects who can install |
| A new endpoint call | Requires the endpoint to exist in `qeet-id-server` first |

Product-level fan-out: `qeet-id-context/CHANGE-MATRIX.md`.

## Hard limits

1. **Never read, write or store the session token.** It is HttpOnly for a reason.
2. **Never add an `Authorization: ApiKey` path.** A browser must not hold a server credential.
3. **Never put a credential in `src/utils/storage.ts`** — preferences only.
4. **Never weaken CSRF** — no "skip for convenience" flag.
5. **Never add a hook for an endpoint that does not exist** (ADR-0002).
6. **Never add a runtime dependency.**
7. **Never omit `"use client"`** on a hook or JSX file.
8. **Never change another repository** from a task scoped to this one.
