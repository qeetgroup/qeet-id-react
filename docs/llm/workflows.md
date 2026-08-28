# Workflows — qeet-id-react

**Level:** L2 · **Last verified:** 2026-08-28
**Verification scope:** every command checked against `package.json` and `.github/workflows/`.

## Set up

```bash
pnpm install
pnpm check      # typecheck + lint + test
```

No services required — tests run in jsdom. There is no `.env`.

## Add a hook

```text
1  VERIFY THE ENDPOINT EXISTS in qeet-id-server — ADR-0002 forbids fictional endpoints
2  pick a sanctioned shape:
     context-read            reads provider state, no I/O
     flow-with-status        a `status` union: idle | loading | complete | error
     data-fetching           exposes `isLoaded`
3  src/hooks/{authentication,identity}/<useX>.ts
4  "use client" at the top
5  add a client method in src/client/client.ts if I/O is needed
6  map snake_case -> camelCase there (this repo's convention)
7  export from src/index.ts
8  test in test/hooks.test.tsx
9  pnpm check
```

**If the endpoint does not exist, stop.** The work is a backend change, not a hook.

## Add a component

```text
1  one component per file, named after its export   (ADR-0003)
2  src/components/{authentication,identity,authorization,common}/
3  "use client"
4  compose existing hooks — do not call the API directly from a component
5  export from src/index.ts
6  test in test/components.test.tsx
7  pnpm check
```

## Add a widget

```text
1  src/widgets/<Widget>.tsx
2  accept `appearance` and apply it via applyAppearance (src/widgets/utils.ts)
3  style with --qeetid-* CSS variables — never hardcode colours
4  widgets require EMBEDDED mode: throw the standard
   "requires apiUrl on <QeetIDProvider>" if the client is null
5  export from src/index.ts
6  pnpm check
```

## Change the transport or CSRF

**Security review required.**

```text
1  src/client/http.ts
2  credentials: "include" on every request — non-negotiable
3  mutations echo qe_csrf as X-CSRF-Token; GET does not
4  the cookie/header names MUST match qeet-id-server AND qeet-id-login
5  test the seeding path (missing cookie -> GET /healthz -> retry)
6  pnpm check
```

**Never add a skip-CSRF flag.** Never add an API-key header.

## Change WebAuthn

**Security review required.**

```text
1  src/client/webauthn.ts
2  ceremony correctness: challenge handling, origin, user verification
3  surface failures as WebAuthnError with reason: unsupported | cancelled | failed
4  NEGATIVE tests: unsupported browser, user cancellation, failed assertion
5  pnpm check
```

## Change the provider modes

**Coordination required — ADR-0001 is a contract with integrators.**

```text
1  src/client/provider.tsx + src/client/config.ts
2  redirect mode MUST keep working with no apiUrl
3  useAuth / useUser / <SignedIn> / <SignedOut> MUST work in BOTH modes
4  flow hooks and widgets throw the standard message in redirect mode
5  update docs/design-decisions/ADR-0001 if the model itself changes
6  test/provider.test.tsx
```

## Release

```text
1  bump package.json version
2  CHANGELOG.md
3  pnpm check && pnpm build
4  tag vX.Y.Z and push the tag
```

> **There is no `src/version.ts` and no version export**, unlike the Go and Node SDKs — yet
> `SECURITY.md` asks reporters for "the SDK version". Adding one is a small, useful fix; doing so
> also makes this repo consistent with its siblings.

> `@qeet-id/react` is not on npm today — see `qeet-id-context/DRIFT-REGISTER.md` QID-009.

## Finish any task

```bash
pnpm check
git diff
```

`ci.yml` here **does** run lint (unlike `qeet-id-node`'s), so `pnpm check` matches CI closely.

### Escalate rather than proceed

Storing a token · adding an API-key path · weakening CSRF · adding a hook for a non-existent
endpoint · changing the two-mode contract · anything requiring another repository.
