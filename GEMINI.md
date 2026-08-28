# GEMINI.md — qeet-id-react

**Read [AGENTS.md](AGENTS.md) first.** It is the model-neutral instruction file and the source of
truth for this repository. This file is a pointer and adds no architecture.

```text
GEMINI.md  →  AGENTS.md  →  docs/llm/*
```

## Canonical context

| File | For |
|---|---|
| [qeet-repo.yml](qeet-repo.yml) | Machine-readable repository identity |
| [AGENTS.md](AGENTS.md) | **Rules, commands, what CI enforces** |
| [docs/llm/context.md](docs/llm/context.md) | How this repository actually works |
| [docs/llm/boundaries.md](docs/llm/boundaries.md) | What it owns, and what it must not touch |
| [docs/llm/workflows.md](docs/llm/workflows.md) | Step-by-step for common changes |
| [docs/llm/architecture-map.md](docs/llm/architecture-map.md) | "Where is X?" — fastest path to a file |

Parent context: **L0** `qeetgroup/qeet-context` · **L1** `qeetgroup/qeet-id-context`.

## What this repository is

`@qeet-id/react` — React hooks, components and prebuilt widgets for Qeet ID. **A browser client, not a management SDK**: cookie + CSRF, never an API key, and it never sees a token.

## Non-negotiables

1. **Never read, write or store the session token.** It is an HttpOnly cookie. `src/utils/storage.ts` is preferences only.
2. **Never add an `Authorization: ApiKey` path.** A browser must not hold a server credential.
3. **Never wrap a fictional endpoint** (ADR-0002). There are deliberately no `usePermission`/`useRole`/`useUsers` hooks — the backend has no session-authenticated endpoint for them.
4. **Redirect mode must keep working without `apiUrl`** (ADR-0001); `useAuth`/`useUser`/`<SignedIn>`/`<SignedOut>` work in both modes.
5. **Never weaken CSRF.** Mutations echo `qe_csrf` as `X-CSRF-Token`; names must match `qeet-id-server` and `qeet-id-login`.
6. This SDK maps wire fields to **camelCase** — `qeet-id-node`'s ADR-0004 deliberately does the opposite. Do not harmonise them.

## Commands

`pnpm install` · `pnpm check` · `pnpm build` · `pnpm test` · `pnpm typecheck` · `pnpm lint`

That list is complete — **do not invent commands.**

## Before finishing

```bash
pnpm check
git diff
```
