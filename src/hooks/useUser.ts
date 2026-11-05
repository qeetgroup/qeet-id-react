"use client";

import { useMemo } from "react";
import type { SessionUser } from "../contract";
import { useQeetIDContext } from "../provider/context";
import { selectIsLoaded, useStoreState } from "./useStoreState";

/** What `useUser` returns. */
export interface UseUserResult {
  /** Whether the server has answered. */
  isLoaded: boolean;
  /** The signed-in person, or `null` while loading and when nobody is signed in. */
  user: SessionUser | null;
}

/**
 * The signed-in person. Re-renders only when they change.
 *
 * ```tsx
 * const { user } = useUser();
 * return <p>Signed in as {user?.name ?? user?.email}</p>;
 * ```
 */
export function useUser(): UseUserResult {
  const { store } = useQeetIDContext("useUser");
  const isLoaded = useStoreState(store, selectIsLoaded);
  const user = useStoreState(store, (state) => state.session?.user ?? null);
  return useMemo(() => ({ isLoaded, user }), [isLoaded, user]);
}
