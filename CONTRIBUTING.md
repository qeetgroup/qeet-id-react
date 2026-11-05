# Contributing

## Setup

```bash
git clone https://github.com/qeetgroup/qeet-id-react
cd qeet-id-react
bun install
bun run verify   # React 18 test install + typecheck + Biome + tests + build + publint + attw
```

Requires Node.js 22.12 or later and bun (`packageManager` in `package.json`). Work lands on `develop`;
`main` is reached by a pull request from `develop`.

## Conventions

- **The browser never calls Qeet ID and never holds a token** (ADR-0001). Everything goes through the
  app's own routes, as [docs/session-contract.md](docs/session-contract.md) defines them.
- **The contract is shared** with `@qeet-id/nextjs` and `@qeet-id/tanstack` (ADR-0002). Every session
  field traces to Qeet ID's ID token, userinfo or management API; changing one is a coordinated change.
- **Names:** PascalCase components and types, `use` + camelCase hooks, `<Component>Props` for props,
  acronyms as words except the brand (`QeetID`). One component per file, named after its export.
- **`"use client"`** starts every module that calls a hook or `createContext`, and no other (ADR-0004).
- **Hooks** read the store through `useStoreState` with a selector that returns part of the state,
  never a new object (ADR-0005).
- **Components**: every string from the provider's `localization`; composites take `StylingProps` and
  use BEM classes; no inline styles; menus use `useMenuButton` (WAI-ARIA APG).
- **Styles** live only in `src/styles.css`, as `var(--qeet-id-…, var(--qx-…, default))` with logical
  properties (ADR-0003).
- **Zero runtime dependencies**, and no design-system dependency. Raise it before adding one.

## Tests

```bash
bun run test            # React 19 and React 18.3
bun run test:coverage
```

Test what a person does: query by role and name, use the keyboard, run `expectAccessible` (axe) on each
state. Stub the session routes with `mockSessionRoutes` from `test/helpers.ts`; use the fixtures in
`test/fixtures.ts`. Rendering tests (`*.test.tsx`) also run on React 18.3.

## Reporting bugs

Open an issue with the component or hook, what you expected, what happened, the React version and
`VERSION` from `@qeet-id/react`.
