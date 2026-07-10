# ADR-0003: One component per file, named after the export; `Button` suffix kept

**Status:** Accepted (revised — an earlier draft of this ADR recommended the
opposite and was reverted before release; kept below for the record)

## Context

The reference implementation inside the `qeet-id` backend monorepo
(`sdk/js/react`) keeps `SignedIn`, `SignedOut`, `SignInButton`,
`SignUpButton`, `SignOutButton`, and `UserButton` all in one file,
`components.tsx`. An earlier pass at this package split trigger components
by category into shared files (`AuthButtons.tsx` holding all three
`*Button` exports) specifically to avoid a file named
`SignInButton.tsx` exporting a same-named `SignInButton` — reasoning that
this was a redundant "stutter."

## Decision

Reverted. Every component gets its own file named after its export:
`SignInButton.tsx` exports `SignInButton`, `SignUpButton.tsx` exports
`SignUpButton`, `SignOutButton.tsx` exports `SignOutButton`,
`UserMenu.tsx` exports `UserButton` (+ the extracted `UserAvatar`). The one
exception: `SignedIn`/`SignedOut` share `SignedIn.tsx` — a mirror-image
pair with trivial, near-identical logic, not a case the one-file-per-export
rule is meant to prevent.

The prebuilt full-page forms live in `src/widgets/` (renamed from
`src/embedded/` — see the folder's own name change below), keeping `SignIn`/
`SignUp`/etc. as their export names with no suffix, since they don't
collide with the `*Button` triggers once each trigger has its own name.

## Why

- **Matches Clerk's exact file-per-component convention**, which this
  package intentionally mirrors — Qeet ID is entering a market where Clerk
  is the reference point for what a CIAM React SDK's API should look like,
  and diverging from an established, well-known convention for an internal
  "avoid stutter" aesthetic preference costs discoverability for no
  real benefit.
- **One file per export is easier to navigate at this file count** than
  grouping is — once there are more than two or three related components,
  "which file has `SignUpButton`" is a more common question than "is this
  organized well," and the former is answered instantly by a
  one-component-per-file layout.

## Folder rename: `embedded/` → `widgets/`

Same session, same reasoning direction: `embedded/` described *how* these
components integrate (inline, not a redirect) but not *what* they are.
`widgets/` says directly that the folder holds prebuilt authentication and
profile UI — clearer to a reader browsing the source tree. Note this is
distinct from "embedded mode" (the `<QeetIDProvider apiUrl=...>` integration
style, see [ADR-0001](./ADR-0001-two-provider-modes.md)) — that term is
unaffected by this rename; it describes provider *behavior*, not a folder.
