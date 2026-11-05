"use client";

import { useCallback, useMemo } from "react";
import type { Session, SessionOrganization } from "../contract";
import type { AccessCheck } from "../core/access";
import { useQeetIDContext } from "../provider/context";
import { selectIsLoaded, useStoreState } from "./useStoreState";

const none: readonly string[] = Object.freeze([]);

/** What `useOrganization` returns. */
export interface UseOrganizationResult {
  /** Whether the server has answered. */
  isLoaded: boolean;
  /** The session's organisation, or `null`. */
  organization: SessionOrganization | null;
  /** The names of the roles the person holds there; empty when signed out. A display hint. */
  roles: readonly string[];
  /** The permission keys the person holds there; empty when signed out. A display hint. */
  permissions: readonly string[];
  /** Whether the person holds a role or permission there. A display hint: the server decides. */
  has: (check: AccessCheck) => boolean;
  /** Moves the session to another organisation and resolves with the new session. */
  switchOrganization: (organizationId: string) => Promise<Session>;
  /** Whether a switch is waiting for the server. */
  isSwitching: boolean;
}

/**
 * The session's organisation, and the person's roles and permissions in it.
 * Re-renders only when those change.
 *
 * ```tsx
 * const { organization, has } = useOrganization();
 * return has({ permission: "invoice.approve" }) ? <ApproveButton /> : null;
 * ```
 */
export function useOrganization(): UseOrganizationResult {
  const { store } = useQeetIDContext("useOrganization");
  const isLoaded = useStoreState(store, selectIsLoaded);
  const organization = useStoreState(store, (state) => state.session?.organization ?? null);
  const roles = useStoreState(store, (state) => state.session?.roles ?? none);
  const permissions = useStoreState(store, (state) => state.session?.permissions ?? none);
  const isSwitching = useStoreState(store, (state) => state.pendingAction === "switch-organization");
  const has = useCallback(
    (check: AccessCheck) =>
      organization !== null &&
      (check.role === undefined || roles.includes(check.role)) &&
      (check.permission === undefined || permissions.includes(check.permission)),
    [organization, roles, permissions],
  );
  const switchOrganization = useCallback((organizationId: string) => store.switchOrganization(organizationId), [store]);
  return useMemo(
    () => ({ isLoaded, organization, roles, permissions, has, switchOrganization, isSwitching }),
    [isLoaded, organization, roles, permissions, has, switchOrganization, isSwitching],
  );
}
