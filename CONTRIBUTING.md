# Contributing

## Setup

```bash
git clone https://github.com/qeetgroup/qeet-id-react
cd qeet-id-react
pnpm install
pnpm check   # typecheck + lint + test
```

Requires Node.js 18.17+ — see `.nvmrc` for the version this repo is
developed against. React 18 or 19 as a peer dependency (not bundled).

## Conventions

- **One package, organized by category folder**, same convention as the
  sibling `qeet-id-node` SDK: `src/hooks/{authentication,identity}/`,
  `src/components/{authentication,identity,authorization,common}/`,
  `src/widgets/`. Every hook/component is still imported directly from the
  package root (`import { useAuth, SignInButton } from "@qeet-id/react"`) —
  the folders are source organization, not part of the public API shape.
- **Every file that uses a hook or renders JSX starts with `"use client"`.**
  This package supports being imported from a Next.js App Router Server
  Component tree, so client boundaries must be explicit at every file that
  needs one.
- **Two hook shapes, pick the one that fits:**
  - *Context-read* (`useAuth`, `useUser`) — no fetching, just projects
    `useQeetIDState()`. No `useState`/`useEffect`.
  - *Flow* (`useSignIn`, `useSignUp`, `useMFA`) — a `status` union
    (`idle`/`loading`/`...`/`error`) driving prebuilt-form UI; every
    failure is caught and converted to `{step: "error", error: string}`,
    never rethrown — callers render from `status`, not `try`/`catch`.
  - *Data-fetching* (`useSession`, `usePasskeys`, `useOrganizationList`) —
    `isLoaded` + data + mutations + `refresh()`, loads on mount via
    `useEffect`.
- **Never wrap a fictional backend endpoint.** This package deliberately
  ships no `usePermission`/`useRole`/`useUsers`/`useOrganizations` (plural,
  admin-listing) hooks, because the real backend has no session-cookie
  "my own permissions/roles" or admin-listing endpoint — only the
  API-key-authenticated management API (`@qeet-id/node`) can do that. See
  [docs/FUTURE.md](docs/FUTURE.md) before adding one back.
- **Never let this package read or write the session token.** It's an
  HttpOnly cookie by design. `src/utils/storage.ts` exists only for
  non-sensitive UI preferences (e.g. "last used sign-in method") — never
  store a credential there.
- **Widgets** (`src/widgets/` — `<SignIn/>`, `<SignUp/>`, `<UserProfile/>`,
  ...) accept an `appearance` prop merged with the provider-level default,
  rendered via `--qeetid-*` CSS variables and `appearance.elements.*`
  className overrides — see `src/widgets/utils.ts`'s `applyAppearance`
  and any existing widget as a template.
- **File-naming**: one component per file, named after the exported
  component (`SignInButton.tsx` exports `SignInButton`, `UserMenu.tsx`
  exports `UserButton`/`UserAvatar`) — matches Clerk's naming, which this
  package intentionally mirrors since Qeet ID competes directly in the
  same category. The one exception is a tightly-coupled mirror-image pair
  with trivial, near-identical logic (`SignedIn`/`SignedOut` share one
  file, `SignedIn.tsx`).

## Tests

```bash
pnpm test          # vitest run (jsdom + @testing-library/react)
pnpm test:coverage
```

## Adding a new hook or component

1. Confirm the backend actually has an endpoint for it — check
   `src/client/client.ts` first; if it needs a new `QeetIDClient` method,
   verify the real route against the `qeet-id` backend source (or its
   already-verified reference at `qeet-id/sdk/js/client/src/client.ts`)
   before adding one.
2. Add the file under the right category folder, following an existing
   hook/component as a template for its shape (see the three hook shapes
   above).
3. Re-export it from the category's `index.ts` and the root `src/index.ts`.
4. Update the resource table in `README.md`.

## Reporting bugs

Open an issue with the exact hook/component usage, expected vs. actual
behavior, and the browser/React version.
