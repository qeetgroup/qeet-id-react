# ADR-0005: One session store per provider, read with useSyncExternalStore

**Status:** Accepted

## Context

The session must render predictably in every state (loading, signed in, signed out, ended, server
unreachable, switching), hydrate without a mismatch, survive StrictMode's double effects, stay fresh
across tabs, focus and expiry, and re-render as little as possible.

## Decision

- **A framework-free `SessionStore`** (`src/core/store.ts`) owns the state and the actions. The
  provider creates one per mount and never at module level, so server rendering can't mix sessions.
  Constructing it has no side effects; `start()` attaches listeners and returns `stop()`.
- **Immutable snapshots** read with `useSyncExternalStore`; `getServerSnapshot` returns the state the
  page was rendered with. Hooks select their own part, and an unchanged part keeps its object
  identity, so `useUser` doesn't re-render for a role change.
- **Four statuses**: `loading`, `signed-in`, `signed-out`, `unavailable` (the first check failed). A
  later failed check keeps the last known session and sets `error`. A session that ends records why:
  `signed-out`, `expired` or `revoked`.
- **Freshness without polling**: a check on focus (at most every five seconds), on reconnection, at
  `expiresAt`, and when another tab says something changed (`BroadcastChannel`, no personal data).
  Checks on their way are shared; an action's answer makes an older check's answer stale.
- **Actions** are bound once per store, so their identities never change.

## Consequences

- Rendering is a pure function of the snapshot; the store is unit-tested without React.
- There are no retries: a failed check waits for the next focus, reconnection or `refresh()`.
