"use client";

import { useEffect, useState } from "react";

import { useQeetIDClient, useQeetIDState } from "../../client/context.js";
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
 * In embedded mode (`apiUrl` on <QeetIDProvider>) it reads the user from the
 * API (`client.currentUser()`), showing `initialState.user` until that
 * answers, and keeping it if the read fails. In redirect mode it is
 * `initialState.user`.
 *
 *   const { isLoaded, user } = useUser();
 */
export function useUser(): UseUserReturn {
  const client = useQeetIDClient();
  const s = useQeetIDState();
  const [fetched, setFetched] = useState<{ user: QeetIDUser | null; failed?: boolean } | null>(null);

  useEffect(() => {
    if (!client) return;
    let live = true;
    client.currentUser().then(
      (user) => {
        if (live) setFetched({ user });
      },
      () => {
        if (live) setFetched({ user: null, failed: true });
      },
    );
    return () => {
      live = false;
    };
  }, [client]);

  const seeded = s.user ?? null;
  if (!client || fetched?.failed) return { isLoaded: s.isLoaded, isAuthenticated: s.isAuthenticated, user: seeded };
  if (!fetched) return { isLoaded: seeded !== null, isAuthenticated: s.isAuthenticated, user: seeded };
  return { isLoaded: true, isAuthenticated: fetched.user !== null, user: fetched.user };
}
