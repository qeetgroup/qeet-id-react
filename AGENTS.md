# AGENTS.md — qeet-id-react

**The model-neutral instruction file for coding agents.** [CLAUDE.md](CLAUDE.md),
[GEMINI.md](GEMINI.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md) point
here and add nothing architectural.

## What this repository is

`@qeet-id/react` v0.1.0 — React hooks, components and prebuilt widgets for Qeet ID. React 18 or 19
as a peer, pnpm, **zero runtime dependencies**, built by Vite in library mode.

> **This is a browser client, not a management SDK.** It is fundamentally different from
> `qeet-id-go` and `qeet-id-node`: **cookie + CSRF, never an API key**, and it **never sees a
> token**. Do not port patterns across without reading
> [docs/llm/boundaries.md](docs/llm/boundaries.md).

## Context hierarchy

```text
qeet-context (L0)  →  qeet-id-context (L1)  →  qeet-id-server (the contract)
                                            →  qeet-id-react (L2 — this repository)
```

## Read before changing code

| File | For |
|---|---|
| [qeet-repo.yml](qeet-repo.yml) | Machine-readable identity |
| [docs/llm/architecture-map.md](docs/llm/architecture-map.md) | "Where is X?" |
| [docs/llm/context.md](docs/llm/context.md) | How this SDK works |
| [docs/llm/boundaries.md](docs/llm/boundaries.md) | Ownership; **cross-SDK differences** |
| [docs/llm/workflows.md](docs/llm/workflows.md) | Adding a hook, component or widget |

Repository ADRs: `docs/design-decisions/` — three, all binding.

## Rules

### 1. Never read or write the session token
The session lives in an **HttpOnly** cookie (`qe_ls`). This SDK cannot read it and must never try.
`src/utils/storage.ts` is for **non-sensitive preferences only** — never a credential.

### 2. Never wrap a fictional endpoint — ADR-0002
There are **deliberately no** `usePermission` / `useRole` / `useUsers` / `useOrganizations` hooks and
no `AuthorizationError`, because the backend has no session-authenticated endpoint for them. Only
the API-key management API can resolve those, and a browser must not hold an API key.
**Verify a route exists in `qeet-id-server` before adding a client method.**

### 3. Two provider modes — ADR-0001
- **Redirect** (no `apiUrl`): `client = null`; buttons navigate to `loginUrl`/`signUpUrl`/`logoutUrl`.
  Flow hooks and widgets throw `"requires apiUrl on <QeetIDProvider>"`.
- **Embedded** (`apiUrl` set): hooks and `<SignIn/>`/`<SignUp/>` drive the API directly.

`useAuth`, `useUser`, `<SignedIn>`, `<SignedOut>` work in **both** — they read `initialState`.

### 4. `"use client"` on every hook and JSX file
Required by `CONTRIBUTING.md` for RSC consumers.

### 5. Three sanctioned hook shapes
Context-read · flow-with-a `status` union · data-fetching-with `isLoaded`. Match one; do not invent
a fourth.

### 6. One component per file, named after its export — ADR-0003
The `Button` suffix is kept (`SignInButton`). This deliberately mirrors Clerk's surface.

### 7. Widgets take `appearance`
Style through `applyAppearance` and the `--qeetid-*` CSS variables. Never hardcode colours.

### 8. camelCase the wire — and know it is deliberate
`src/client/client.ts` maps snake_case API responses to camelCase domain types
(`client_name` → `clientName`). **The Node SDK's ADR-0004 does the opposite on purpose.** Do not
"harmonise" them.

### 9. Never add an API-key path
No `Authorization: ApiKey` header, ever. A browser must not hold a server credential.

## Commands

```bash
pnpm install
pnpm check      # typecheck + lint + test — THE gate
pnpm build      # vite lib mode + dts
pnpm test       # vitest, jsdom
pnpm typecheck
pnpm lint
pnpm format
```

Also `pnpm dev` (vite build --watch), `pnpm test:watch`, `pnpm test:coverage`, `pnpm lint:fix`.

## What CI enforces

`ci.yml` (Node 18.17/20/22/24): install, typecheck, **lint**, build, `test:coverage` — note
`qeet-id-node`'s `ci.yml` omits lint; this one includes it. `lint.yml`: eslint + prettier check.
`security.yml`: `pnpm audit` + gitleaks. `codeql.yml`: JS/TS. `release.yml`: tag `v*` → npm publish.

## Before you finish

```bash
pnpm check
git diff
```

## Distribution status — know this

**`@qeet-id/react` is not on npm — the registry returns 404**, and there is no release tag. There is
also **no version export** (`src/version.ts` does not exist) even though `SECURITY.md` asks reporters
for "the SDK version". See `qeet-id-context/DRIFT-REGISTER.md` QID-009.

## Escalate rather than proceed

Storing a token · adding an API-key path · weakening CSRF · adding a hook for an endpoint that does
not exist · changing the two-mode contract · anything requiring another repository.
