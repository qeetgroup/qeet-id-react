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
`useOrganizationList` (every organization the signed-in user belongs to,
from `GET /v1/me/organizations`) are in scope and already shipped.

## No organization creation from the browser

`POST /v1/tenants` answers with a token pair, so the hosted-login cookie
doesn't reach it. `<CreateOrganization/>` collects the name and hands it to
the app's `onCreate`, whose server makes that call with the signed-in user's
access token.
