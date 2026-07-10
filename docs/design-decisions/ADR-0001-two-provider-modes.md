# ADR-0001: Two provider modes — redirect vs. embedded

**Status:** Accepted

## Context

Every CIAM React SDK has to answer: does the SDK drive the actual
login/signup UI itself (embedded), or does it just redirect to a hosted
page and read back the resulting session (redirect)? Clerk and WorkOS both
support both; committing to only one would force every consumer into a
shape that doesn't fit their app.

## Decision

`<QeetIDProvider>` supports both, switched by whether `apiUrl` is passed:

- No `apiUrl` → **redirect mode**. `<SignInButton>`/`<SignUpButton>`/
  `<SignOutButton>` navigate the browser to configurable `loginUrl`/
  `signUpUrl`/`logoutUrl` paths (meant to be backed by
  `@qeet-id/nextjs`'s hosted-login route handlers, or an equivalent). No
  `QeetIDClient` exists; `useQeetIDClient()` returns `null`.
- `apiUrl` set → **embedded mode**. A `QeetIDClient` is constructed and
  every flow hook / embedded form drives authentication directly against
  the API, no redirect.

`useAuth`/`useUser`/`<SignedIn>`/`<SignedOut>` work identically in both
modes, since they only ever read state — never make a network call.

## Why

- **Matches the reference implementation** already shipping inside the
  `qeet-id` backend monorepo (`sdk/js/react`) — this package is a
  from-scratch-repo port of that, not a redesign, so its API-shape
  decisions (this one included) carry over unless there's a concrete
  reason to diverge.
- **No forced choice for consumers.** A marketing site or admin console
  that already has its own login page wants redirect mode; a product
  that wants Qeet's auth UI inline (no full-page navigation) wants
  embedded mode. Both are real, common integration shapes.
