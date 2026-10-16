"use client";

import { useState, useEffect, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";
import type { Passkey } from "../../types/session.js";

export interface UsePasskeysReturn {
  isLoaded: boolean;
  passkeys: Passkey[];
  error: string | null;
  register(): Promise<void>;
  rename(passkeyId: string, name: string): Promise<void>;
  remove(passkeyId: string): Promise<void>;
  refresh(): Promise<void>;
}

/**
 * usePasskeys lists the current user's passkeys and provides register, rename
 * and delete operations. Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 *
 *   const { passkeys, register, rename, remove } = usePasskeys();
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

  const rename = useCallback(
    async (passkeyId: string, name: string) => {
      if (!client) throw new Error("usePasskeys requires apiUrl on <QeetIDProvider>");
      const renamed = await client.passkeys.rename(passkeyId, name);
      setPasskeys((prev) => prev.map((p) => (p.id === passkeyId ? renamed : p)));
    },
    [client],
  );

  const remove = useCallback(
    async (passkeyId: string) => {
      if (!client) throw new Error("usePasskeys requires apiUrl on <QeetIDProvider>");
      await client.passkeys.delete(passkeyId);
      setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
    },
    [client],
  );

  return { isLoaded, passkeys, error, register, rename, remove, refresh: load };
}
