# ADR-0002: The session contract

**Status:** Accepted

## Context

Three packages must agree on how the browser learns who is signed in and how it acts: this one in the
browser, `@qeet-id/nextjs` and `@qeet-id/tanstack` on the server. Any other server should be able to
implement it from a document.

## Decision

The contract is [docs/session-contract.md](../session-contract.md), and its types and helpers are
`src/contract.ts`, published as the server-safe entry `@qeet-id/react/contract`.

- **Six routes under a configurable base path**, `/auth` by default: `sign-in`, `sign-up` and
  `callback` are page navigations; `session` is a `GET`; `sign-out` and `switch-organization` are
  `POST`s with JSON.
- **The session JSON is our own, in camelCase**, and every field is traced to Qeet ID's ID token,
  `/v1/oauth/userinfo` or the management API. No field is invented; a value the server can't know is
  `null` or `[]`, never missing.
- **`GET session` answers `200` with `null`** for nobody signed in; signed out is a state, not an
  error. The server renews the access token there.
- **Errors** are `{ "error": { "code", "message" } }` with a fixed list of codes.
- **CSRF**: every request carries `X-Qeet-ID-Request: 1`; the server refuses a `POST` without it.
- **Return paths** go through `safeReturnTo` on both sides.
- **`Cache-Control: no-store`** on every answer.
- **Parameters Qeet ID doesn't take yet** (`organization` and `loginHint` on sign-in, a sign-up hint,
  switching) stay in the contract, documented as ignored or answered `501`, so the browser SDK doesn't
  change when Qeet ID adds them.

The fields started from an outline agreed between the three SDKs; the document lists where Qeet ID's
real claims changed it.

## Consequences

- The contract is a published API: changing a route, a field or a code is a major version of all three
  packages. Adding an optional field or a new error code is not.
- `parseSession` lets every side check a session the same way; a newer server's extra fields are
  dropped, and an older server's missing nullable fields become `null`.
