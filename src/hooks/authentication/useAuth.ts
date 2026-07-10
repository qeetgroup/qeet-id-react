"use client";

import { useQeetIDState } from "../../client/context.js";

export interface UseAuthReturn {
  /** False during the brief window before `<QeetIDProvider>` mounts. */
  isLoaded: boolean;
  isAuthenticated: boolean;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
}

/**
 * Returns the session identity (no profile) — the cheapest way to gate
 * rendering on sign-in state. For the user's profile, use `useUser`.
 *
 *   const { isLoaded, isAuthenticated, userId } = useAuth();
 */
export function useAuth(): UseAuthReturn {
  const s = useQeetIDState();
  return {
    isLoaded: s.isLoaded,
    isAuthenticated: s.isAuthenticated,
    userId: s.userId,
    tenantId: s.tenantId,
    sessionId: s.sessionId,
  };
}
