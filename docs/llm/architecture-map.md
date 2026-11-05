# Architecture map — qeet-id-react

**Level:** L2 · **Last verified:** 2026-11-05. "Where is X?"

| Looking for | File |
| :-- | :-- |
| The session contract: types, routes, CSRF header, `safeReturnTo`, `parseSession` | `src/contract.ts`, `docs/session-contract.md` |
| Everything exported | `src/index.ts`, `src/testing.ts` |
| The session's state and actions | `src/core/store.ts` |
| The HTTP calls to the session routes | `src/core/transport.ts` |
| Return paths, sign-in URLs, safe navigation | `src/core/navigation.ts` |
| Cross-tab messages | `src/core/tabs.ts` |
| `has()` (roles and permissions) | `src/core/access.ts` |
| Development warnings | `src/core/development.ts` |
| The provider | `src/provider/QeetIDProvider.tsx` |
| The context (shared across builds) | `src/provider/context.ts` |
| Default strings, `{placeholder}` formatting | `src/provider/localization.ts` |
| Hooks | `src/hooks/use*.ts` |
| Components | `src/components/*.tsx` |
| The single-child button | `src/components/internal/Trigger.tsx` |
| The APG menu button | `src/components/internal/useMenuButton.ts` |
| Avatars and initials | `src/components/internal/Avatar.tsx` |
| BEM class names, `StylingProps` | `src/components/internal/classNames.ts` |
| The stylesheet | `src/styles.css` |
| The test provider | `src/testing/` |
| `QeetIDError` | `src/errors.ts` |
| `VERSION` | `src/version.ts` (from `package.json` at build time) |
| Build | `tsdown.config.ts` |
| Test setup, the React 18 project | `vitest.config.ts`, `test/setup.ts`, `test/react-18/` |
| Test helpers (mocked routes, axe) | `test/helpers.ts`, `test/fixtures.ts` |
| Decisions | `docs/design-decisions/ADR-000{1..5}-*.md` |
| Practices and sources | `docs/engineering-practices.md` |
