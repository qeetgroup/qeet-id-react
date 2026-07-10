# Architecture

## Two layers: a cookie-based browser client, and React on top

`@qeet-id/react` is two things bundled as one package:

1. **`src/client/`** — a framework-agnostic, cookie-based browser HTTP
   client (`QeetIDClient`) plus the React context/provider that exposes it.
   Unlike the sibling `@qeet-id/node` (bearer/ApiKey auth, holds a secret),
   this client never holds a secret — the backend sets an HttpOnly SSO
   cookie, and every request uses `credentials: "include"`. Mutations echo
   a CSRF double-submit token the backend seeds on any GET.
2. **`src/hooks/`, `src/components/`, `src/widgets/`** — the actual React
   surface built on top of `src/client/`'s context: hooks for headless
   integrations, small trigger components (`SignInButton`, `UserButton`)
   for redirect-to-hosted-login integrations, and full embedded forms
   (`<SignIn/>`, `<SignUp/>`, `<UserProfile/>`, ...) for apps that want
   Qeet ID's auth UI inline rather than a redirect.

## Two provider modes

`<QeetIDProvider>` supports two distinct integration styles, switched by
whether `apiUrl` is passed:

- **Redirect mode** (no `apiUrl`): `useAuth`/`useUser` read
  server-computed `initialState`; `<SignInButton>`/`<SignUpButton>`/
  `<SignOutButton>` just navigate the browser to `loginUrl`/`signUpUrl`/
  `logoutUrl` (defaults to `/api/auth/*`, meant to be backed by
  `@qeet-id/nextjs`'s hosted-login handlers or an equivalent on another
  framework). No `QeetIDClient` is constructed; `useQeetIDClient()` returns
  `null`.
- **Embedded mode** (`apiUrl` set): a `QeetIDClient` is constructed and
  every flow/data-fetching hook (`useSignIn`, `useSession`, `usePasskeys`,
  ...) and every embedded form component drives authentication directly
  against the API — no redirect. Every such hook/component throws a clear
  `"... requires apiUrl on <QeetIDProvider>"` error if called without it,
  rather than silently no-op'ing.

Both modes share the same `useAuth`/`useUser`/`SignedIn`/`SignedOut` — those
only ever read state, so they work identically either way.

## Why hooks never throw past their own boundary

Every flow hook (`useSignIn`, `useSignUp`, `useMFA`, `useSignOut`) catches
every failure internally and converts it to `{step: "error", error: string}`
on its `status` return value — it never lets an exception propagate to the
caller. This is deliberate: the whole point of the status union is that a
component (prebuilt or your own) renders UI *from* `status`, not from a
`try`/`catch` around the hook call. Data-fetching hooks (`useSession`,
`usePasskeys`) are the exception — their *mutations* (`revoke`, `register`,
`remove`) do throw on failure (there's no multi-step "flow" to render
statuses for; a caller wraps the specific button's `onClick` in its own
error handling if it wants to).

## The appearance system

Every embedded form component accepts an `appearance` prop
(`{theme, variables, elements}`), merged with `<QeetIDProvider appearance=...>`'s
provider-level default. `variables` map to `--qeetid-*` CSS custom
properties (`applyAppearance` in `src/widgets/utils.ts`); every inline
style in an embedded component reads `var(--qeetid-color-primary, #F26D0E)`
— falling back to Qeet's brand orange when no override is set. `elements`
supplies a `className` per named slot (`card`, `formInput`,
`buttonPrimary`, ...), merged onto the internal element so a consumer's own
CSS (Tailwind, CSS Modules, whatever) can restyle without needing a full
custom implementation.

## No session token ever touches this code

The session is an HttpOnly cookie — by design, invisible to JavaScript, so
no XSS payload running in the page can steal it. This package correspondingly
never reads or stores it; `src/utils/storage.ts` exists only for
non-sensitive UI preferences, never a credential.

## See also

[docs/design-decisions/](../design-decisions/) for the trade-offs behind
splitting the reference implementation's single `context.tsx`/`components.tsx`
into this package's category-folder layout, and for exactly which
hooks/components were deliberately left out because the real backend has
no endpoint to back them — see also [docs/FUTURE.md](../FUTURE.md).
