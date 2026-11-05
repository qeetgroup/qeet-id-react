"use client";

import { useSyncExternalStore } from "react";
import type { SessionState, SessionStore } from "../core/store";

/**
 * One part of the store's state, re-rendering only when that part changes.
 * `select` must return a primitive or an object from the state itself, never a
 * new one.
 */
export function useStoreState<T>(store: SessionStore, select: (state: SessionState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.getSnapshot()),
    () => select(store.getServerSnapshot()),
  );
}

/** Whether the server has answered: `signed-in` or `signed-out`. */
export function selectIsLoaded(state: SessionState): boolean {
  return state.status === "signed-in" || state.status === "signed-out";
}
