# ADR-0002: No permission/role self-service hooks, no admin-listing hooks

**Status:** Accepted

## Context

A tree of intended files for this package included
`usePermission`/`usePermissions`/`useRole`/`useRoles` hooks,
`RequirePermission`/`RequireRole` components, and `useUsers`/
`useOrganizations` (plural) admin-listing hooks. Before implementing them,
the real Qeet ID backend was checked for a session-cookie-authenticated
endpoint each would call.

## Decision

None of the above were implemented. Confirmed against the backend source
(`domains/access/authentication/http.go`'s `/auth/me` handler, and the
absence of any `me/permissions`/`me/roles` or session-scoped admin-listing
route): there is no self-service RBAC lookup or admin-listing endpoint a
browser session can call. Only the API-key-authenticated management API
(a different SDK, `@qeet-id/node`) can resolve permissions, roles, or list
users/organizations across a tenant.

`RequireAuth` was kept — it only needs `useAuth().isAuthenticated`, no
backend call, so it has no such gap. `useUser`/`useOrganization`/
`useOrganizationList` (singular — "my own") were kept, since the reference
implementation already honestly degrades them to session-derived
single-item data rather than a real list, with no fictional call
underneath.

## Why

Throughout this whole project's SDK work (Go, Node), the established rule
has been: never wrap a backend endpoint that doesn't exist. A hook that
compiles but 404s on every call is worse than no hook — it looks supported
until a consumer actually tries it in production. Better to document the
gap in [docs/FUTURE.md](../FUTURE.md) and add the real hook the moment the
backend ships the endpoint.
