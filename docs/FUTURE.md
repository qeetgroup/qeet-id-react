# Future work

What this SDK leaves for later, and what it waits for.

## Waiting for Qeet ID

| When Qeet ID… | This SDK |
| :-- | :-- |
| lets an application ask for an organisation at sign-in (an authorize parameter) | nothing changes: `signIn({ organization })` already sends it; the server SDKs pass it on |
| takes a login hint at authorize | nothing changes: `signIn({ loginHint })` already sends it |
| takes a sign-up hint at authorize | nothing changes: `sign-up` is already its own route |
| lets an application switch a person's organisation | nothing changes: the server answers `switch-organization` with a session instead of `501` |
| gives applications a person's organisations | add an optional `organizations` to the session (a minor version); `<OrganizationSwitcher>` reads it when the app passes none |

These are gaps in `qeet-id-server` today (see "What Qeet ID provides" in
[session-contract.md](session-contract.md)).

## Possible additions

- `locale`, `updatedAt`, `phoneNumber`, `authenticatedAt` (`auth_time`) on the session, as optional
  keys, if apps ask for them.
- A `<SessionLoading>`/`<SessionUnavailable>` pair of gates, if `useSession().status` proves awkward.
- More `<UserButton>` item kinds (icons, groups), keeping the APG menu pattern.
