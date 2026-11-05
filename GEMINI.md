# GEMINI.md — qeet-id-react

**Read [AGENTS.md](AGENTS.md) first.** It is the model-neutral instruction file and the source of
truth for this repository. This file is a pointer and adds no architecture.

```text
GEMINI.md  →  AGENTS.md  →  docs/llm/*
```

## Canonical context

| File | For |
| :-- | :-- |
| [qeet-repo.yml](qeet-repo.yml) | Machine-readable repository identity |
| [AGENTS.md](AGENTS.md) | **Rules, commands, what CI enforces** |
| [docs/session-contract.md](docs/session-contract.md) | The contract the server SDKs implement |
| [docs/llm/context.md](docs/llm/context.md) | How this repository actually works |
| [docs/llm/boundaries.md](docs/llm/boundaries.md) | What it owns, and what it must not touch |
| [docs/llm/workflows.md](docs/llm/workflows.md) | Step-by-step for common changes |
| [docs/llm/architecture-map.md](docs/llm/architecture-map.md) | "Where is X?" — fastest path to a file |

Parent context: **L0** `qeetgroup/qeet-context` · **L1** `qeetgroup/qeet-id-context`.

## What this repository is

`@qeet-id/react` — the React SDK for Qeet ID, for the browser: provider, hooks and components for apps
whose people sign in on Qeet ID's hosted pages and whose session lives on the app's own server. It
owns the session contract the server SDKs implement.

## Non-negotiables

1. **Never call Qeet ID and never hold a token** — only the app's own `{basePath}/*` routes.
2. **No invented session fields** — every field traces to Qeet ID's claims or management API.
3. **Keep the CSRF header, POST for changes, `safeReturnTo`, and no inline styles.**
4. **`"use client"` only where hooks or context are used.**
5. **No module-level session state; React 18.3 and 19 both supported.**
6. **No runtime or design-system dependency.**

## Commands

`bun install` · `bun run verify` · `bun run build` · `bun run test` · `bun run typecheck` · `bun run check`

That list is complete — **do not invent commands.**

## Before finishing

```bash
bun run verify
git diff
```
