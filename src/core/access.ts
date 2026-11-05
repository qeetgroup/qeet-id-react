import type { Session } from "../contract";

/**
 * A role or permission to check for, in the session's organisation. With both,
 * both must hold. A display hint: the server decides what a person may do.
 */
export interface AccessCheck {
  /** A role name, as in `session.roles`, such as `"Finance approver"`. */
  role?: string;
  /** A permission key, as in `session.permissions`, such as `"invoice.approve"`. */
  permission?: string;
}

/** Whether `session` holds what `check` asks for; `false` without a session. */
export function hasAccess(session: Session | null, check: AccessCheck): boolean {
  if (session === null) return false;
  if (check.role !== undefined && !session.roles.includes(check.role)) return false;
  if (check.permission !== undefined && !session.permissions.includes(check.permission)) return false;
  return true;
}
