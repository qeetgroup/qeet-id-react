"use client";

import { useState, useEffect, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";
import type { Session } from "../../types/session.js";

export interface UseSessionReturn {
  isLoaded: boolean;
  sessions: Session[];
  error: string | null;
  revoke(sessionId: string): Promise<void>;
  refresh(): Promise<void>;
}

/**
 * useSession lists and manages the current user's active sessions.
 * Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 *
 *   const { sessions, revoke } = useSession();
 */
export function useSession(): UseSessionReturn {
  const client = useQeetIDClient();
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setError(null);
    try {
      const list = await client.sessions.list();
      setSessions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setIsLoaded(true);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = useCallback(
    async (sessionId: string) => {
      if (!client) throw new Error("useSession requires apiUrl on <QeetIDProvider>");
      await client.sessions.revoke(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    },
    [client],
  );

  return { isLoaded, sessions, error, revoke, refresh: load };
}
