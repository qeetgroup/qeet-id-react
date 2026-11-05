# Engineering practices

The practices this SDK follows, where each comes from, and why an enterprise front end needs it.
Researched on 5 November 2026. When a practice changes, change it here first and record why.

## What comparable SDKs ship

| SDK | Model | What it gives a React app | Taken here |
| :-- | :-- | :-- | :-- |
| [Clerk React](https://clerk.com/docs/react/reference/hooks/use-auth) | its own session cookie and token | `useAuth` (`isLoaded`, `isSignedIn`, `orgId`, `orgRole`, `has()`), `useUser`, `useOrganization`; `<SignedIn>`/`<SignedOut>`; [`<Show>`](https://clerk.com/docs/react/reference/components/control/protect) (formerly `<Protect>`) with `role`/`permission`/`condition` and `fallback`; [`<UserButton>`](https://clerk.com/docs/react/reference/components/user/user-button); [`<OrganizationSwitcher>`](https://clerk.com/docs/react/reference/components/organization/organization-switcher); buttons that take the app's own child button | the hook split, `has()` as a display hint, the components, the single-child button |
| [Auth0 React](https://github.com/auth0/auth0-react) | tokens in the browser | `useAuth0` (`isLoading`, `isAuthenticated`, `user`, `error`, `loginWithRedirect`, `logout`), `withAuthenticationRequired` | `error` in the state; a guard that redirects to sign-in |
| [WorkOS AuthKit React](https://github.com/workos/authkit-react) | hosted login ([AuthKit](https://workos.com/docs/user-management/authkit)) | `useAuth` (`user`, `organizationId`, `role`, `roles`, `permissions`, `signIn`, `signUp`, `signOut`, `switchToOrganization`), refresh callbacks | hosted pages only; roles and permissions of the [active organisation](https://workos.com/docs/reference/authkit/session-tokens); `switchOrganization` |
| [Okta React](https://developer.okta.com/docs/guides/sign-into-spa-redirect/react/main/) | tokens in the browser | `<Security>`, `useOktaAuth` (`authState`), `<LoginCallback>`, a route guard, `restoreOriginalUri` | return to the page you came from |
| [Kinde React](https://docs.kinde.com/developer-tools/sdks/frontend/react-sdk/) | tokens in the browser | `useKindeAuth` (`user`, `isLoading`, `login`, `register`, `logout`, `getOrganization`, `getPermission`), `refreshOnFocus`, `onSuccess`/`onError`/`onEvent` | refetch on focus; `onError`; `organization` and `loginHint` on sign-in |
| [Descope React](https://docs.descope.com/getting-started/react) | its own session | `useSession` (`isAuthenticated`, `isSessionLoading`), `useUser`, `useDescope` (`logout`) | the session/user/actions split |

Every one of them except AuthKit's hosted mode keeps tokens in the browser. This SDK follows the
backend-for-frontend pattern instead, so it leaves out everything that hands a token to script.

## The model and browser security

| Practice | How this SDK applies it | Why an enterprise front end needs it | Source |
| :-- | :-- | :-- | :-- |
| Backend for frontend | the browser talks only to the app's own `{basePath}/*` routes; tokens stay in the server's HttpOnly cookie; no `getToken()` | an XSS bug can misuse a session but can't steal a token and use it elsewhere | [RFC 10017 (BCP 212) §6.1](https://www.rfc-editor.org/rfc/rfc10017.html#section-6.1) |
| Hosted sign-in | `signIn`/`signUp` navigate the whole page to the server, which starts authorization code + PKCE at Qeet ID | MFA, passkeys, SSO and policy live in one audited place, not in every app | RFC 10017 §6.1; [AuthKit](https://workos.com/docs/user-management/authkit) |
| A custom header on every request | `X-Qeet-ID-Request: 1` (`CSRF_HEADER`); the server refuses a POST without it | another site can't forge a sign-out or a switch: a custom header forces a CORS preflight the routes never allow | RFC 10017 §6.1.3.3.2; [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) ("custom request headers") |
| No state change on GET | sign-out and switching are `POST` + `fetch`, then a navigation | an `<img src=/auth/sign-out>` on another site does nothing | [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) (SameSite=Lax and GET) |
| Same-origin return paths only | `safeReturnTo` on both sides: refuses other origins, `//host`, `/\host`, schemes, credentials, control characters, over 2048 characters | the sign-in routes can't become an open redirect for phishing | [OWASP unvalidated redirects](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html) |
| Only http(s) navigations | `redirectTo`, menu-item `href`s and avatar URLs must be http(s) or a path | a compromised answer can't run `javascript:` in the app's origin | OWASP unvalidated redirects |
| CSP-safe | no inline `style`, no injected `<style>` or `<script>`, no `eval`; the stylesheet is a file the app links | the app keeps a strict `Content-Security-Policy` without exceptions | [OWASP CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) |
| `Cache-Control: no-store`; `cache: "no-store"` | the contract requires it of the server, and `fetch` asks for it | a shared cache never serves one person's session to another | [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| Avatars without a referrer | `referrerPolicy="no-referrer"` on the picture | the app's URLs don't leak to the picture's host | [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy) |
| Roles and permissions are hints | `has()`, `<Protect>` and `useOrganization` say so in their docs; the server checks every request | hiding a button isn't authorisation; the component's code still reaches the browser | [Clerk `<Show>`](https://clerk.com/docs/react/reference/components/control/protect) ("only visually hides its children") |

## State, rendering and freshness

| Practice | How | Why | Source |
| :-- | :-- | :-- | :-- |
| An external store read with `useSyncExternalStore` | one `SessionStore` per provider; immutable snapshots; selectors per hook; unchanged parts keep their identity | consistent reads in concurrent rendering, and a component re-renders only when its part changed | [React: useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) |
| Server rendering with `initialSession` | `getServerSnapshot` returns the state the page was rendered with, so hydration matches | no flash of the signed-out UI and no hydration mismatch in Next.js or TanStack Start | [React: hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot); useSyncExternalStore (`getServerSnapshot`) |
| No module-level session | the store lives in the provider; nothing is shared between requests | a server rendering many people's pages can't leak one session into another | React: useSyncExternalStore (server data must be passed per render) |
| StrictMode-safe effects | constructing the store has no side effects; `start()` returns `stop()`; checks on the way are shared | development double-invocation makes one request, and nothing leaks in production | [React: StrictMode](https://react.dev/reference/react/StrictMode) |
| Rules of hooks | Biome's `useHookAtTopLevel` and `useExhaustiveDependencies` are errors; hooks run before any early return | components behave the same on every render | [React: rules of hooks](https://react.dev/reference/rules/rules-of-hooks) |
| Four explicit states | `loading`, `signed-in`, `signed-out`, `unavailable` (the first check failed); `<SignedIn>`/`<SignedOut>` render only on an answer | an outage doesn't render a signed-out page to a signed-in person | Clerk `isLoaded`; Auth0 `isLoading`/`error` |
| Why a session ended | `endReason`: `signed-out`, `expired`, `revoked`, and `onSignOut(reason)` | the app can say "your session expired" instead of silently showing the sign-in button | WorkOS `onRefreshFailure`; Kinde `onEvent` |
| Refetch on focus and reconnect | at most once in five seconds on focus; on `online` | a laptop opened after lunch shows the truth, not the morning's session | [Kinde `refreshOnFocus`](https://docs.kinde.com/developer-tools/sdks/frontend/react-sdk/) |
| React to expiry | a timer at `expiresAt` asks the server, which renews or ends it | the UI never claims a session the server has already ended | WorkOS `refreshBufferInterval` |
| Cross-tab sync | `BroadcastChannel` named after the session route, carrying `{type}` only, no personal data | signing out in one tab signs out every tab; a shared computer isn't left signed in | [MDN: Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) (Baseline since March 2022) |
| Callbacks | `onSessionChange`, `onSignOut`, `onError`, read fresh on every event; an exception in one is reported, never breaks the store | apps clear data caches on a user or organisation change and log failures | Kinde `onSuccess`/`onError`; WorkOS `onRefresh` |
| A failed sign-in is reported | the server adds `?authError=<code>`; the provider reads it once, reports it, and removes it with `history.replaceState`, keeping the router's state | people learn why signing in didn't work instead of landing signed out | Auth0 React `error` after the redirect callback |
| Switching organisation | `POST switch-organization` returns the new session; other tabs are told; `afterSwitchUrl` loads a page so no cache of the old organisation survives | B2B apps must never show one tenant's data under another's name | [WorkOS `switchToOrganization`](https://github.com/workos/authkit-react); Clerk `afterSelectOrganizationUrl` |

## React Server Components and packaging

| Practice | How | Why | Source |
| :-- | :-- | :-- | :-- |
| `"use client"` per module | each module that uses hooks or context starts with it; the entries, the contract, errors and strings don't; `test/package.test.ts` checks the built files | Server Components import types, `QeetIDError` and the contract freely, and the boundary is exactly where interactivity starts | [React: 'use client'](https://react.dev/reference/rsc/use-client) ("libraries … ship their own 'use client' markers") |
| A server-safe contract entry | `@qeet-id/react/contract`: no React, no directive | the server SDKs and route handlers share the browser's exact types and checks | React: 'use client' |
| Serializable provider props | `initialSession`, `basePath` and `localization` are plain data; strings use `{name}` placeholders, not functions | a Server Component layout can render `<QeetIDProvider>` directly | React: 'use client' (serializable props) |
| ES module and CommonJS, one file per module | tsdown, unbundled, `.mjs`/`.cjs` with `.d.mts`/`.d.cts`, `typesVersions` for `moduleResolution: node` | Jest and older TypeScript settings still `require`; bundlers drop what isn't imported | [Node.js: packages](https://nodejs.org/api/packages.html); [Are the types wrong?](https://github.com/arethetypeswrong/arethetypeswrong.github.io) |
| One context across both builds | the context is kept in a `Symbol.for` registry per React copy | an app that loads both builds still finds its provider | [Node.js: dual package hazard](https://nodejs.org/api/packages.html#dual-package-hazard) |
| `sideEffects: ["**/*.css"]` | the code has no side effects; the stylesheet does | tree shaking works and the CSS import survives | [webpack: sideEffects](https://webpack.js.org/guides/tree-shaking/) |
| React only | `react` is the one peer dependency (`^18.3.0 \|\| ^19.0.0`); no runtime dependencies | nothing for security review to chase; no version conflicts | React 19 upgrade notes ([React 19](https://react.dev/blog/2024/12/05/react-19)) |
| React 18.3 and 19 | no 19-only API (`use`, `<Context value>`, ref as a prop); every rendering test runs on both | enterprises upgrade React on their own schedule | [React 19](https://react.dev/blog/2024/12/05/react-19) |
| Package checks | `publint --strict` and `attw --pack .` in `bun run verify` | a broken `exports` map is caught before customers see it | [publint](https://publint.dev/rules) |

## Components and accessibility

| Practice | How | Why | Source |
| :-- | :-- | :-- | :-- |
| Menu button pattern | `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`; Enter/Space/Down open on the first item, Up on the last | keyboard and screen-reader users work the account menu like any other | [WAI-ARIA APG: menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) |
| Menu keyboard | arrows wrap, Home/End, type-ahead, Escape returns focus, Tab closes, focus moves into the menu on open | the same | [WAI-ARIA APG: menu and menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) |
| Organisations as `menuitemradio` | choosing one acts at once, and `aria-checked` says which is current | a listbox is for a value a form submits later, not an action | [WAI-ARIA APG: menu](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/); [listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) |
| Live status | the switcher says "Switching to …" and a failure in a `role="status"` region; buttons are `aria-busy` while waiting | people who can't see the spinner know what happened | [WAI-ARIA: status role](https://www.w3.org/TR/wai-aria-1.2/#status) |
| Label in name | the account button is named "Account menu for Meera Iyer", which contains the visible name | voice-control users say what they see | [WCAG 2.2: 2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html) |
| Target size | controls are at least 24 px in the stylesheet | touch and tremor | [WCAG 2.2: 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| The app's own button | a single child element receives the click (its ref, class and handlers kept; `preventDefault()` cancels); a warning when it isn't a button | apps keep their design system's button and its accessibility | Clerk's buttons; [Radix composition](https://www.radix-ui.com/primitives/docs/guides/composition) ("it is your responsibility to ensure it remains accessible") |
| Avatar fallbacks | picture → initials (whole graphemes, so "இ" stays whole) → a person icon; a picture that failed before hydration is caught | broken images and missing names never show a broken icon | — |
| Every string localisable | `localization` on the provider, with `{name}` and `{organization}` placeholders | Indian and international customers ship in their languages | Clerk localization |
| Right to left | logical CSS properties; no left/right in code | Arabic and Urdu layouts mirror without overrides | [MDN: logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) |
| Checked automatically | axe-core (WCAG 2.2 A/AA and best practice) on every component state in the tests | regressions are caught before release | [axe-core](https://github.com/dequelabs/axe-core) |

## Styling

| Practice | How | Why | Source |
| :-- | :-- | :-- | :-- |
| No design-system dependency | plain elements and BEM classes (`qeet-id-user-button__trigger`), `className`, `classNames` per part, `unstyled` | any app, any design system, no version lock-step | ADR-0003 |
| An opt-in stylesheet | `@qeet-id/react/styles.css`, never imported by the code | apps that style it themselves ship no unused CSS | — |
| Layered custom properties | `var(--qeet-id-…, var(--qx-…, <Qeet default>))`; defaults copied from `@qeetrix/tokens` | apps on Qeetrix match it with no work; others change one property | — |
| A cascade layer | everything in `@layer qeet-id` | the app's own rules win without specificity fights | [MDN: @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) |
| Dark mode | `prefers-color-scheme`, overridden by `data-theme="dark"` or `"light"`; `forced-colors` handled | follows the app's theme switch and Windows high contrast | [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) |

## Developer experience

| Practice | How | Why |
| :-- | :-- | :-- |
| Strong types | the session is typed end to end; every option, prop, state and error code is a named type | mistakes surface in the editor, not in production |
| Clear development errors | a hook outside the provider names the hook and the fix; a misshapen `initialSession` names the field; a 404 or an HTML answer hints at an unmounted route; `warnOnce` for a non-button child, a foreign `returnTo` or a changed `basePath` | integration problems explain themselves |
| A testing entry | `@qeet-id/react/testing`: `QeetIDTestProvider` (real hooks and components, no server, navigations recorded) and `createTestSession` | customers test their own UI in every session state without mocking `fetch` |
| One error type | `QeetIDError` with a stable `code` and `status`; branch on `code`, never on `message` | error handling that survives copy changes |

## Considered and left out

| Left out | Why |
| :-- | :-- |
| `getToken()`/`getAccessToken()` | the browser holds no token; API calls go through the app's server (RFC 10017 §6.1) |
| Embedded sign-in, sign-up, MFA, passkey and profile forms | Qeet ID's hosted pages do them; the old embedded flows were removed |
| `<UserProfile>`, `<OrganizationProfile>`, `<CreateOrganization>` | account and organisation management need the user's own token, which only Qeet ID's pages and the app's server hold |
| A list of a person's organisations from Qeet ID | Qeet ID refuses application tokens at `/v1/me/organizations` today; the app passes the list to `<OrganizationSwitcher>` |
| Polling, retries with backoff, request timeouts | focus, reconnection and expiry checks cover freshness; retry engines belong in server SDKs |
| Storing anything in `localStorage` or `sessionStorage` | nothing in the browser needs to outlive the page; tabs talk over `BroadcastChannel` |
| Feature flags, entitlements, impersonation details | Qeet ID doesn't put them in an application's tokens |

## Tooling

| Practice | How | Source |
| :-- | :-- | :-- |
| Supported runtimes | Node.js `>=22.12.0` for building and server rendering; CI on 22, 24 and 26 | [Node.js release schedule](https://github.com/nodejs/Release/blob/main/schedule.json) |
| Build | tsdown (tsup's README points to it) | [tsdown](https://tsdown.dev/guide/) |
| Lint and format | Biome, with the React and accessibility rules as errors | [Biome](https://biomejs.dev/linter/rules/) |
| Tests | Vitest, jsdom and Testing Library, as a person uses the UI: roles, names and the keyboard | [Testing Library: guiding principles](https://testing-library.com/docs/guiding-principles) |
| Versions and history | Semantic Versioning; Keep a Changelog | [semver.org](https://semver.org/spec/v2.0.0.html); [keepachangelog.com](https://keepachangelog.com/en/1.1.0/) |
| Provenance | `publishConfig.provenance: true`; the release workflow publishes from GitHub Actions | [npm provenance](https://docs.npmjs.com/generating-provenance-statements) |
