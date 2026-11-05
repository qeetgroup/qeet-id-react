# ADR-0003: No design-system dependency; the app's own button; an optional stylesheet

**Status:** Accepted

## Context

Apps that use this SDK have their own design systems; Qeet's products use Qeetrix. A dependency on
`@qeetrix/react`, `@qeetrix/ui`, `@qeetrix/tokens` or Tailwind would force a version lock-step on every
customer and add weight to apps that never show the SDK's components.

## Decision

- **Trigger buttons** (`SignInButton`, `SignUpButton`, `SignOutButton`) render a plain
  `<button type="button">`, or give the click to the app's own button passed as the **single child
  element**: `<SignInButton><Button variant="primary">Sign in</Button></SignInButton>`. The child keeps
  its ref, class and handlers; its own `event.preventDefault()` cancels the action. A child that is a
  non-button host element gets a development warning. This is the familiar Clerk pattern; it needs no
  `asChild` prop, and a string or several children simply become the label.
- **Composite components** (`UserButton`, `OrganizationSwitcher`) render plain elements with BEM
  classes (`qeet-id-user-button__trigger`) and `data-state` attributes. Every part takes a class
  (`className`, `classNames`), and `unstyled` drops the SDK's own classes.
- **An optional stylesheet**, `@qeet-id/react/styles.css`, is never imported by the code. It is built
  on the SDK's custom properties with layered fallbacks,
  `var(--qeet-id-…, var(--qx-…, <Qeet default>))`, so an app that loads Qeetrix's tokens matches
  Qeetrix without doing anything. The defaults are copied from `@qeetrix/tokens`, never imported. It
  sits in `@layer qeet-id`, follows `prefers-color-scheme` with `data-theme="dark"`/`"light"`
  overriding, handles `forced-colors`, and uses logical properties for right-to-left pages.
- **No inline styles**, ever, so a strict `Content-Security-Policy` needs no exception.

## Consequences

- The SDK's components fit any design system; a Qeetrix app looks native with one CSS import.
- When Qeetrix changes a default, the copied values here are updated by hand.
- The menus are positioned by CSS alone (no positioning library), so they open below their button.
