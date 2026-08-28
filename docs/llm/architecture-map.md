# Architecture Map — qeet-id-react

**Level:** L2 · **Last verified:** 2026-08-28
**Verification scope:** every path below was confirmed to exist.

| Need | Path |
|---|---|
| Repository identity | [`qeet-repo.yml`](../../qeet-repo.yml) |
| Agent instructions | [`AGENTS.md`](../../AGENTS.md) |
| **Public barrel — the export contract** | `src/index.ts` |

## Client layer

| Concern | Path |
|---|---|
| `QeetIDClient` + nested `passkeys`/`magicLink`/`sessions` | `src/client/client.ts` |
| **Browser HTTP transport — cookie + CSRF** | `src/client/http.ts` |
| Provider, the two modes | `src/client/provider.tsx` |
| React contexts (4) | `src/client/context.tsx` |
| Options / props types | `src/client/config.ts` |
| **WebAuthn ceremonies** | `src/client/webauthn.ts` |

## Surface

```text
src/hooks/authentication/   useAuth · useSession · useSignIn · useSignUp
                            useSignOut · usePasskeys · useMFA
src/hooks/identity/         useUser · useOrganization · useOrganizationList
src/components/             authentication/ · identity/ · authorization/ · common/
src/widgets/                SignIn · SignUp · UserProfile · OrganizationProfile
                            OrganizationSwitcher · CreateOrganization  (+ utils.ts)
```

11 components: `SignedIn` `SignedOut` `SignInButton` `SignUpButton` `SignOutButton`
`SessionStatus` `UserAvatar` `UserButton` `RequireAuth` `Loading` `Spinner` `ErrorBoundary`.

## Support

| Concern | Path |
|---|---|
| Errors — `AuthenticationError`, `WebAuthnError` | `src/errors/AuthenticationError.ts` |
| CSRF + default redirect paths | `src/constants/auth.ts` |
| Domain types | `src/types/{auth,common,organization,session,user}.ts` |
| Cookies, crypto, session, storage, token, validation | `src/utils/` |
| Appearance application (`--qeetid-*` vars) | `src/widgets/utils.ts` |

> `src/utils/storage.ts` is **non-sensitive preferences only** — never a credential.

## Decisions

| ADR | Decision |
|---|---|
| `docs/design-decisions/ADR-0001-two-provider-modes.md` | Redirect vs embedded |
| `docs/design-decisions/ADR-0002-no-fictional-endpoints.md` | No hooks for endpoints that do not exist |
| `docs/design-decisions/ADR-0003-file-naming.md` | One component per file, named after its export |

Also `docs/architecture/ARCHITECTURE.md`, `docs/FUTURE.md`.

## Build, test, CI

| | |
|---|---|
| Scripts | `package.json` |
| Build | `vite.config.ts` — lib mode, `vite-plugin-dts`, externals react/react-dom/jsx-runtime |
| Tests | `test/` — 4 test files + `test/setup.ts`, vitest + jsdom + Testing Library |
| CI | `.github/workflows/{ci,lint,security,codeql,release}.yml` |

## What is deliberately absent

No retry · no timeout · no logger · no pagination · no JWKS verification · no webhook verification ·
no version export. All present in `qeet-id-go` / `qeet-id-node`; **none belongs in a browser client.**

## Upstream

The API contract lives in **`qeet-id-server`**, under its OpenAPI documents. Not vendored here.
