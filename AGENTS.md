# AGENTS.md — qeet-id-react

**The model-neutral instruction file for coding agents.** [CLAUDE.md](CLAUDE.md),
[GEMINI.md](GEMINI.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md) point
here and add nothing architectural.

## What this repository is

The **React SDK for Qeet ID**, `@qeet-id/react`, for the browser: a provider, hooks and components for
apps whose people sign in on Qeet ID's hosted pages and whose session lives on the app's own server.
React 18.3 or 19 as the only peer, **zero runtime dependencies**, bun and Biome, TypeScript 7, built by
tsdown into ES module and CommonJS files with declarations. Not yet published.

It owns **the session contract** (`src/contract.ts`, [docs/session-contract.md](docs/session-contract.md))
that `qeet-id-nextjs` and `qeet-id-tanstack` implement on the server.

## Read before changing code

| File | For |
| :-- | :-- |
| [qeet-repo.yml](qeet-repo.yml) | Machine-readable identity |
| [docs/session-contract.md](docs/session-contract.md) | The routes, JSON and rules the server SDKs implement |
| [docs/llm/architecture-map.md](docs/llm/architecture-map.md) | "Where is X?" |
| [docs/llm/context.md](docs/llm/context.md) | How this SDK works |
| [docs/llm/boundaries.md](docs/llm/boundaries.md) | What it owns, and what it must not touch |
| [docs/llm/workflows.md](docs/llm/workflows.md) | Adding a session field, a hook or a component; releasing |
| [docs/engineering-practices.md](docs/engineering-practices.md) | The practices followed, with sources |

Decisions: `docs/design-decisions/` (ADR-0001 to ADR-0005), all binding.

## Rules

1. **Never call Qeet ID and never hold a token** (ADR-0001). The browser talks only to the app's own
   `{basePath}/*` routes. No `getToken()`, no `Authorization` header, nothing in `localStorage` or
   `sessionStorage`. The embedded sign-in, MFA, passkey and profile flows were removed on purpose; do
   not bring them back.
2. **No server-SDK machinery in the browser**: no retry or backoff engine, idempotency keys,
   pagination or management-API wrappers.
3. **The contract is a published API** (ADR-0002). Every session field must trace to Qeet ID's ID
   token, userinfo or a management route; never invent one. Changing a route, field or code breaks
   the server SDKs.
4. **Never weaken the browser's defences**: the `X-Qeet-ID-Request` header on every request, POST for
   anything that changes state, `safeReturnTo` for every return path, http(s)-only navigation, no
   inline styles or injected elements (CSP).
5. **`"use client"` exactly where React state is used** (ADR-0004): every module calling a hook or
   `createContext` starts with it; `index.ts`, `contract.ts`, `errors.ts`, `version.ts`, `testing.ts`
   and `provider/localization.ts` never do. `test/package.test.ts` checks the build.
6. **No module-level session state** (ADR-0005): one store per provider; constructing it has no side
   effects.
7. **React 18.3 and 19**: no 19-only API (`use`, `<Context value>`, ref as a prop). Every rendering test
   runs on both.
8. **No design-system dependency** (ADR-0003): plain elements, BEM classes, `className`/`classNames`/
   `unstyled`; styles only in `src/styles.css` with `var(--qeet-id-…, var(--qx-…, default))`.
9. **Accessible by default**: WAI-ARIA APG patterns, every string from `localization`, logical CSS for
   right to left, axe in the tests.
10. **Roles and permissions are display hints**: say so wherever they appear.

## Commands

```bash
bun install
bun run verify          # install React 18 for its tests + typecheck + Biome + tests + build + publint + attw — the gate
bun run build           # tsdown
bun run test            # vitest run: React 19 and React 18.3 projects
bun run typecheck       # tsc --noEmit (TypeScript 7)
bun run check           # Biome lint and format check
bun run check:package   # publint --strict && attw --pack .
```

Also `bun run install:react-18`, `bun run dev`, `bun run test:watch`, `bun run test:coverage`,
`bun run lint`, `bun run lint:fix`, `bun run format`.

## What CI enforces

`ci.yml` on Node.js 22, 24 and 26: install (and the React 18 test install), typecheck, build, tests
with coverage, package checks. `lint.yml`: `bun run check`. `security.yml`: `bun audit
--audit-level=high` and gitleaks. `codeql.yml`.
`version.yml` bumps the patch in `package.json` on every pull request into `main` (raise minor or major by
hand). `release.yml` runs on every push to `main`: when that version is not on npm yet, it runs the gate,
publishes with provenance, then tags `vX.Y.Z` and opens a GitHub Release; otherwise it does nothing.
`rollback.yml` points the npm `latest` dist-tag back at an earlier version.

## Branches

Two long-lived branches: `develop`, where work lands, and `main`, what is released. Changes reach
`main` only by a pull request from `develop`. There are no release branches: a version is a `vX.Y.Z`
tag, made by `release.yml` when a pull request is merged into `main`.

## Before you finish

```bash
bun run verify
git diff
```

## Escalate rather than proceed

Holding a token or calling Qeet ID from the browser · changing the session contract · weakening the
CSRF header, the return-path check or CSP safety · a runtime dependency · a design-system dependency ·
renaming or removing an export · anything requiring another repository · the package name or first
published version.
