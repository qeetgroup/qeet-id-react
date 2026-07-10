# Future

Capabilities other CIAM React SDKs (Clerk, Auth0 React, WorkOS AuthKit)
expose that `@qeet-id/react` doesn't, because the Qeet ID *backend* doesn't
have a session-authenticated endpoint for them yet. These aren't SDK gaps
to fill with stub hooks that would always fail at runtime — they're named
here so this SDK adds real coverage the moment the backend ships the
missing endpoint.

## No self-service permissions/roles

`usePermission`/`usePermissions`/`useRole`/`useRoles` and the
`RequirePermission`/`RequireRole` components don't exist in this package.
The real backend's RBAC surface (`GET /v1/check`, effective-permissions
lookup, role assignment) is only reachable with a server-side API key — it
has no session-cookie-authenticated "what can *I* currently do" endpoint a
browser could call safely. `RequireAuth` (gates on sign-in state only) is
the one authorization component that *is* in scope, since it needs no
backend call at all.

## No admin-listing hooks

`useUsers`/`useOrganizations` (plural — "list every user/org") don't exist.
There's no session-authenticated admin-listing endpoint for a browser to
call; listing users/organizations across a tenant is a management-API
operation (`@qeet-id/node`), not something an end-user's own session can
do. `useUser`/`useOrganization` (singular, "my own") and
`useOrganizationList` (the current user's own tenant membership — today
that's just their one active tenant, since there's no true multi-org
membership endpoint either) are in scope and already shipped.

## `/v1/auth/me` doesn't return a profile yet

The real handler today returns only session-principal claims
(`user_id`, `tenant_id`, `session_id`, `actor`, `scopes`) — no
`email`/`displayName`. `QeetIDUser` already declares those two fields as
optional so `useUser()`/`<UserButton/>` degrade gracefully (falling back to
"Account" as a label) rather than assuming they're always present. Once
`/v1/auth/me` is enriched, no SDK change is needed — the fields will just
start arriving.

## No true multi-organization membership

There's no "list every organization I'm a member of" endpoint — only the
single tenant carried in the session, switchable via
`POST /v1/auth/switch-tenant`. `useOrganizationList`/`<OrganizationSwitcher/>`
already handle this honestly (an org list of length ≤ 1 renders as a plain
label, not a switcher) rather than pretending multi-org support exists.
