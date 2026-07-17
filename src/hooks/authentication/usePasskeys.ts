"use client";

import { useState, useEffect, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";
import type { Passkey } from "../../types/session.js";

export interface UsePasskeysReturn {
  isLoaded: boolean;
  passkeys: Passkey[];
  error: string | null;
  register(): Promise<void>;
  remove(passkeyId: string): Promise<void>;
  refresh(): Promise<void>;
}

/**
 * usePasskeys lists the current user's passkeys and provides register/delete
 * operations. Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 *
 *   const { passkeys, register, remove } = usePasskeys();
 */
export function usePasskeys(): UsePasskeysReturn {
  const client = useQeetIDClient();
  const [isLoaded, setIsLoaded] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setError(null);
    try {
      const list = await client.passkeys.list();
      setPasskeys(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load passkeys");
    } finally {
      setIsLoaded(true);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const register = useCallback(async () => {
    if (!client) throw new Error("usePasskeys requires apiUrl on <QeetIDProvider>");
    await client.passkeys.register();
    await load();
  }, [client, load]);

  const remove = useCallback(
    async (passkeyId: string) => {
      if (!client) throw new Error("usePasskeys requires apiUrl on <QeetIDProvider>");
      await client.passkeys.delete(passkeyId);
      setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
    },
    [client],
  );

  return { isLoaded, passkeys, error, register, remove, refresh: load };
}
