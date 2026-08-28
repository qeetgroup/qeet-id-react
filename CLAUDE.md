# CLAUDE.md — qeet-id-react

**Read [AGENTS.md](AGENTS.md) first.** It is the model-neutral instruction file and the source of
truth for this repository. This file adds only Claude-specific guidance.

```text
CLAUDE.md  →  AGENTS.md  →  docs/llm/*
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
Read them when a task needs organization or product understanding; this repository does not restate them.

## The things most likely to trip you up here

1. **Never read, write or store the session token.** It is an HttpOnly cookie. `src/utils/storage.ts` is preferences only.
2. **Never add an `Authorization: ApiKey` path.** A browser must not hold a server credential.
3. **Never wrap a fictional endpoint** (ADR-0002). There are deliberately no `usePermission`/`useRole`/`useUsers` hooks — the backend has no session-authenticated endpoint for them.
4. **Redirect mode must keep working without `apiUrl`** (ADR-0001); `useAuth`/`useUser`/`<SignedIn>`/`<SignedOut>` work in both modes.
5. **Never weaken CSRF.** Mutations echo `qe_csrf` as `X-CSRF-Token`; names must match `qeet-id-server` and `qeet-id-login`.
6. This SDK maps wire fields to **camelCase** — `qeet-id-node`'s ADR-0004 deliberately does the opposite. Do not harmonise them.

## Working style

- **Read before editing.** Match the neighbouring file's shape rather than introducing an abstraction.
- Use the architecture map instead of guessing a path.
- **Do not read `.env*` or secret files** into anything you write.

## Finishing a change

```bash
pnpm check
git diff
```

## Escalate rather than proceed

Stop and report if a task would weaken a security control, change a published contract, or require
modifying another repository. Cross-repository impact: `qeet-id-context/CHANGE-MATRIX.md`.
