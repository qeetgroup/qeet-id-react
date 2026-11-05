# Repository Context — qeet-id-react

**Level:** L2 · **Status:** active · **Evidence state:** verified · **Last verified:** 2026-11-05
**Verification scope:** exports, store behaviour, contract, components, build output and CI read from
source; every session field traced to `qeet-id-server` (`fix/server-release-1.0`).

## Identity

`@qeet-id/react` — the React SDK for Qeet ID, for the browser. React 18.3 or 19 as the only peer,
**zero runtime dependencies**, bun and Biome, TypeScript 7, built by tsdown into ES module and
CommonJS files, one per source module.

**Status: development. Not yet published to npm.**

## Context inheritance

```text
qeet-context (L0)  →  qeet-id-context (L1)  →  qeet-id-server (Qeet ID)
                                            →  qeet-id-react (L2 — this document)
                                                 ↑ implemented on the server by qeet-id-nextjs, qeet-id-tanstack
```

## Responsibilities

The session in a React app whose people sign in on Qeet ID's hosted pages and whose session lives on
its own server (ADR-0001): the session contract (`src/contract.ts`, ADR-0002), the provider and its
store (ADR-0005), the hooks, the components, the optional stylesheet (ADR-0003) and a testing entry.

## Non-responsibilities

**It never calls Qeet ID and never holds a token.** Sign-in, sign-up, MFA, passkeys and account
management happen on Qeet ID's hosted pages. The routes that exchange codes, keep tokens and renew
them are the server SDKs' (`qeet-id-nextjs`, `qeet-id-tanstack`). Management of users, roles and
organisations is `qeet-id-node`'s, on a server.

## Architecture

See [docs/architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md).

```text
<QeetIDProvider>         creates one SessionStore; start() on mount, stop() on unmount
  ↓ context (store, strings)
hooks / components       useSyncExternalStore on the store, each selecting its part
  ↓ actions
SessionStore             src/core/store.ts — state, checks, sign-in/out, switching, tabs, expiry
  ↓
fetchTransport           src/core/transport.ts — GET/POST {basePath}/*, X-Qeet-ID-Request: 1
  ↓
the app's own server     (@qeet-id/nextjs, @qeet-id/tanstack)
```

## The session contract

**Evidence:** `src/contract.ts`, `docs/session-contract.md`

| Property | Value |
| :-- | :-- |
| Base path | `/auth` (configurable on both sides) |
| Routes | `sign-in`, `sign-up`, `callback` (navigations); `session` (GET); `sign-out`, `switch-organization` (POST JSON) |
| CSRF | `X-Qeet-ID-Request: 1` on every request; required on POST |
| Session | `{ user: { id, email, emailVerified, name, picture }, organization: { id, name } \| null, roles, permissions, expiresAt }` |
| Errors | `{ error: { code, message } }`; codes in `SessionErrorCode` |
| Return paths | `safeReturnTo(value, origin)` on both sides |
| Callback failure | `?authError=<SignInErrorCode>` on the return path |

## State

**Evidence:** `src/core/store.ts`

`status` is `loading`, `signed-in`, `signed-out` or `unavailable`; `error`, `endReason`
(`signed-out`, `expired`, `revoked`) and `pendingAction` (`sign-out`, `switch-organization`) complete
the snapshot. Checks run on start (unless `initialSession`), on focus (at most every 5 s), on
`online`, at `expiresAt` and on another tab's message; checks on their way are shared.

## Entries

| Entry | Directive | Contents |
| :-- | :-- | :-- |
| `@qeet-id/react` | none on the entry; on each client module | provider, hooks, components, `QeetIDError`, `VERSION`, types |
| `@qeet-id/react/contract` | none, no React | the contract's types, constants and helpers |
| `@qeet-id/react/testing` | on the provider module | `QeetIDTestProvider`, `createTestSession` |
| `@qeet-id/react/styles.css` | — | the optional stylesheet |

## Tests

`test/` with Vitest, jsdom, Testing Library and axe-core: the store, the transport, the contract,
the provider and hooks (render counts, StrictMode), every component (roles, keyboard, focus, axe),
the testing entry, server rendering, hydration and the built package. The rendering tests also run on
React 18.3 (`vitest --project react-18`, from `test/react-18`).
