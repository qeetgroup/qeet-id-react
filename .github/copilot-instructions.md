# GitHub Copilot — qeet-id-react

**Canonical instructions: [`AGENTS.md`](../AGENTS.md).** This file is a summary; it adds no
architecture.

## Repository

`@qeet-id/react` — the React SDK for Qeet ID, for the browser. React 18.3 or 19, bun, Biome,
TypeScript 7, **zero runtime dependencies**, ES module and CommonJS builds via tsdown. It owns the
session contract (`src/contract.ts`) that the Next.js and TanStack Start SDKs implement.

## Structure

`src/contract.ts` (the contract, no React) · `src/core/` (store, transport, navigation, tabs, access) ·
`src/provider/` (provider, context, strings) · `src/hooks/` · `src/components/` (+ `internal/`) ·
`src/testing/` · `src/styles.css` · `src/index.ts` (every export).

## Rules

1. **Never call Qeet ID and never hold a token**; only the app's own `{basePath}/*` routes.
2. **No invented session fields**; the contract is shared with the server SDKs.
3. **Keep `X-Qeet-ID-Request`, POST for changes, `safeReturnTo`, http(s)-only navigation, no inline styles.**
4. **`"use client"` only on modules that use hooks or context.**
5. **No module-level session state; no React 19-only API.**

## Commands

`bun install` · `bun run verify` · `bun run build` · `bun run test` · `bun run typecheck` · `bun run check`

## Do not

- add `getToken()`, an `Authorization` header, or any storage of a credential
- call `api.id.qeet.in` or any Qeet ID endpoint from the browser
- add retries, backoff, pagination or management calls
- write an inline `style` or inject a `<style>` element
- add a runtime dependency or a design-system dependency
- invent scripts — read `package.json`
