# ADR-0001: Hosted login, and a browser SDK that never holds a token

**Status:** Accepted

## Context

The first version of this SDK ran sign-in, sign-up, MFA, passkeys and profile management in the
browser against Qeet ID's API, in two provider modes (redirect and embedded). Every flow had to be
rebuilt in each app, every policy change in Qeet ID had to be mirrored here, and the embedded mode put
Qeet ID's API on the app's page.

The IETF's best current practice for browser applications
([RFC 10017](https://www.rfc-editor.org/rfc/rfc10017.html), BCP 212) recommends the
backend-for-frontend pattern (§6.1): a confidential client on the app's own server keeps the tokens in
an HttpOnly cookie session, and script on the page never sees them.

## Decision

Qeet ID is hosted-login first. People sign in, sign up, do MFA and passkeys on Qeet ID's hosted pages
(OpenID Connect authorization code with PKCE). The app's server is the OAuth client and keeps the
tokens. Three packages serve React apps:

| Package | Runs in | Role |
| :-- | :-- | :-- |
| `@qeet-id/react` (this one) | the browser | provider, hooks and components; talks only to the app's own routes |
| `@qeet-id/nextjs` | Next.js | implements the routes and route protection |
| `@qeet-id/tanstack` | TanStack Start | the same with server functions and middleware |

This package therefore:

- never calls Qeet ID, and never holds, reads or asks for a token (no `getToken()`);
- reads the session from `{basePath}/session` and acts through `{basePath}/*` (ADR-0002);
- carries no server-SDK machinery: no retry or backoff engine, idempotency keys, pagination or
  management-API wrappers.

The embedded flows, the browser API client, the widgets and the two provider modes are removed and
are not to come back.

## Consequences

- An XSS bug can misuse a session while the page is open but can't take a token elsewhere.
- Every Qeet ID policy (MFA, passkeys, SSO, address rules) applies without an SDK release.
- The app needs a server. Client-only apps run the routes on a small server of their own or use one
  of the server SDKs.
- Features that need the person's own token (managing their account or organisation) live on Qeet
  ID's hosted pages or the app's server, not here.
