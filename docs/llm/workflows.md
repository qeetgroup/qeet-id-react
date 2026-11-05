# Workflows — qeet-id-react

**Level:** L2 · **Last verified:** 2026-11-05
**Verification scope:** every command checked against `package.json` and `.github/workflows/`.

## Set up

```bash
bun install
bun run verify   # React 18 test install + typecheck + Biome + tests (React 19 and 18.3) + build + publint + attw
```

No services are needed: tests stub `fetch`.

## Add a field to the session

```text
1  find its source in qeet-id-server: the ID token (internal/federation/oidc/token.go signIDToken),
   userinfo (userinfo.go), or a management route an API key may call. No source, no field.
2  src/contract.ts      the type, its doc comment (claim and scope), parseSession (nullable → null)
3  docs/session-contract.md   the JSON example, the field table, "What Qeet ID provides"
4  test/contract.test.ts      parseSession and the type assertions
5  CHANGELOG: an optional key is a minor change; tell qeet-id-nextjs and qeet-id-tanstack
```

## Add a hook

```text
1  src/hooks/useX.ts, starting with "use client"
2  read the store with useStoreState and a selector that returns a part of the state, never a new object
3  export it and its result type from src/index.ts
4  test: values, the error outside a provider, and that it re-renders only for its part
```

## Add a component

```text
1  src/components/X.tsx, starting with "use client"; hooks before any early return
2  strings from the provider's localization (add the key to QeetIDLocalization and defaultLocalization)
3  a composite: StylingProps, BEM classes through partClasses, no inline style; styles in src/styles.css
   with var(--qeet-id-…, var(--qx-…, default)) and logical properties
4  a menu: useMenuButton, role="menu" in the JSX, items with a menuitem role and tabIndex={-1}
5  test: roles and names, the keyboard, focus, axe (expectAccessible), strings, classes, React 18
6  export from src/index.ts; README
```

## Release

Open a pull request from `develop` into `main`: `version.yml` bumps the patch in `package.json` on the
PR branch (for a minor or major, set the version yourself). Merging it runs `release.yml`: when npm
does not have that version yet, it runs the gate, publishes with provenance, then tags `vX.Y.Z` and
opens a GitHub Release. A push whose version is already on npm releases nothing, so re-running is
safe. A bad release is not unpublished: `rollback.yml` points `latest` back at a good version, then
release a fix.
