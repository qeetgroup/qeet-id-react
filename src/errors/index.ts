export { AuthenticationError, WebAuthnError } from "./AuthenticationError.js";

// No AuthorizationError: this package doesn't ship permission/role hooks
// (usePermission, useRole) or the components built on them, because the
// real backend has no session-authenticated "my own permissions/roles"
// endpoint today — only the API-key-authenticated management API
// (`@qeet-id/node`) can resolve those. See docs/FUTURE.md.
