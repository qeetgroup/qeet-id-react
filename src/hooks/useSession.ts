"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Session, SessionOrganization, SessionUser } from "../contract";
import { type AccessCheck, hasAccess } from "../core/access";
import type { PendingAction, SessionEndReason, SessionStatus } from "../core/store";
import type { QeetIDError } from "../errors";
import { useQeetIDContext } from "../provider/context";
import type { QeetIDActions } from "./useQeetID";

/** What `useSession` returns: the session's state and its actions. */
export interface UseSessionResult extends QeetIDActions {
  /** `loading`, `signed-in`, `signed-out`, or `unavailable` when the first check failed. */
  status: SessionStatus;
  /** Whether the server has answered: `status` is `signed-in` or `signed-out`. */
  isLoaded: boolean;
  /** Whether someone is signed in. `false` while loading too, so check `isLoaded` first. */
  isSignedIn: boolean;
  /** The session, or `null`. */
  session: Session | null;
  /** `session.user`, or `null`. */
  user: SessionUser | null;
  /** `session.organization`, or `null`. */
  organization: SessionOrganization | null;
  /** The latest failure, or `null`. A failed check keeps the last known session. */
  error: QeetIDError | null;
  /** Why the last known session ended (`signed-out`, `expired`, `revoked`), until someone signs in again. */
  endReason: SessionEndReason | null;
  /** `sign-out` or `switch-organization` while the server is answering one, otherwise `null`. */
  pendingAction: PendingAction | null;
  /**
   * Whether the session holds a role or permission in its organisation. A
   * display hint for showing and hiding UI: the server decides.
   */
  has: (check: AccessCheck) => boolean;
}

/**
 * The session and its actions. Re-renders whenever the session's state
 * changes; read `useUser`, `useOrganization` or `useQeetID` to re-render less.
 *
 * ```tsx
 * const { status, user, signIn } = useSession();
 * if (status === "loading") return <Spinner />;
 * ```
 */
export function useSession(): UseSessionResult {
  const { store } = useQeetIDContext("useSession");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const { actions } = store;
  const { session } = state;
  const has = useCallback((check: AccessCheck) => hasAccess(session, check), [session]);
  return useMemo(
    () => ({
      ...actions,
      status: state.status,
      isLoaded: state.status === "signed-in" || state.status === "signed-out",
      isSignedIn: state.status === "signed-in",
      session,
      user: session?.user ?? null,
      organization: session?.organization ?? null,
      error: state.error,
      endReason: state.endReason,
      pendingAction: state.pendingAction,
      has,
    }),
    [actions, state, session, has],
  );
}
