# ADR-0004: Packaging for every React setup

**Status:** Accepted

## Context

The SDK is imported from Next.js App Router (Server and Client Components), TanStack Start, Vite and
Create React App style apps, Jest and Vitest, on React 18.3 and 19.

## Decision

- **Four entries**: `@qeet-id/react` (provider, hooks, components), `@qeet-id/react/contract`
  (server-safe: no React), `@qeet-id/react/testing` (the test provider) and
  `@qeet-id/react/styles.css`.
- **`"use client"` per module**, not per entry: every module that uses hooks or context starts with
  it; the entries, the contract, the error class and the strings don't, so a Server Component imports
  types, `QeetIDError` and the contract freely. A test builds the package and checks the directive is
  the first statement of exactly those modules in both formats.
- **ES module and CommonJS**, unbundled (one file per module) by tsdown, `.d.mts`/`.d.cts` for each,
  `typesVersions` for `moduleResolution: node`, `sideEffects: ["**/*.css"]`. `publint --strict` and
  `attw --pack .` must pass.
- **One React context across both builds**: kept in a `Symbol.for` registry per React copy, so an app
  that loads both builds still finds its provider (the dual package hazard).
- **React is the only peer dependency** (`^18.3.0 || ^19.0.0`); no runtime dependencies. No 19-only
  API is used, and every rendering test runs on React 18.3 and 19.

## Revisit

Drop the CommonJS build once Jest and the TypeScript settings that need it are rare among customers;
that is a major version. Drop React 18 when React's own support for it ends.
