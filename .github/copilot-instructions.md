# GitHub Copilot — qeet-id-react

**Canonical instructions: [`AGENTS.md`](../AGENTS.md).** This file is a summary; it adds no
architecture.

## Repository

`@qeet-id/react` — React hooks, components and prebuilt widgets for Qeet ID. **A browser client, not a management SDK**: cookie + CSRF, never an API key, and it never sees a token.

Context: **L0** `qeet-context` (organization) → **L1** `qeet-id-context` (product) → **L2** this
repository → source.

## Structure

`src/{client,hooks,components,widgets,errors,constants,types,utils}/`. 10 hooks, 11 components, 6 widgets. Two provider modes — **redirect** (no `apiUrl`) and **embedded** (`apiUrl` set). One component per file named after its export (ADR-0003). `"use client"` on every hook and JSX file.

## Rules

1. **Never read, write or store the session token.** It is an HttpOnly cookie. `src/utils/storage.ts` is preferences only.
2. **Never add an `Authorization: ApiKey` path.** A browser must not hold a server credential.
3. **Never wrap a fictional endpoint** (ADR-0002). There are deliberately no `usePermission`/`useRole`/`useUsers` hooks — the backend has no session-authenticated endpoint for them.
4. **Redirect mode must keep working without `apiUrl`** (ADR-0001); `useAuth`/`useUser`/`<SignedIn>`/`<SignedOut>` work in both modes.
5. **Never weaken CSRF.** Mutations echo `qe_csrf` as `X-CSRF-Token`; names must match `qeet-id-server` and `qeet-id-login`.
6. This SDK maps wire fields to **camelCase** — `qeet-id-node`'s ADR-0004 deliberately does the opposite. Do not harmonise them.

## Commands

`pnpm install` · `pnpm check` · `pnpm build` · `pnpm test` · `pnpm typecheck` · `pnpm lint`

## Do not

- store a token or any credential in localStorage/sessionStorage
- add an API-key or bearer header to the browser client
- add a hook for an endpoint that does not exist in `qeet-id-server`
- omit `"use client"` on a hook or JSX file
- hardcode colours — style through `appearance` and `--qeetid-*` variables
- add a runtime dependency
