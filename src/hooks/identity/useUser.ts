"use client";

import { useQeetIDState } from "../../client/context.js";
import type { QeetIDUser } from "../../types/user.js";

export interface UseUserReturn {
  isLoaded: boolean;
  isAuthenticated: boolean;
  user: QeetIDUser | null;
}

/**
 * Returns the signed-in user's profile (or null when signed out). For just
 * the session identity (userId/tenantId, no profile), use `useAuth`.
 *
 *   const { isLoaded, user } = useUser();
 */
export function useUser(): UseUserReturn {
  const s = useQeetIDState();
  return { isLoaded: s.isLoaded, isAuthenticated: s.isAuthenticated, user: s.user ?? null };
}
