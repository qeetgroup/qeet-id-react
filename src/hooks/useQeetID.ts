"use client";

import type { SessionActions } from "../core/store";
import { useQeetIDContext } from "../provider/context";

/** The session's actions. Their identities never change, so they are safe in effect dependencies. */
export type QeetIDActions = SessionActions;

/**
 * The session's actions, without its state: a component that only signs in or
 * out never re-renders when the session changes.
 *
 * ```tsx
 * const { signIn } = useQeetID();
 * <button type="button" onClick={() => signIn({ returnTo: "/invoices" })}>Review invoices</button>
 * ```
 */
export function useQeetID(): QeetIDActions {
  return useQeetIDContext("useQeetID").store.actions;
}
