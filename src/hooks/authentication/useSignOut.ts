"use client";

import { useState, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";

export interface UseSignOutReturn {
  status: "idle" | "loading" | "complete" | "error";
  signOut(): Promise<void>;
  error?: string;
}

/**
 * useSignOut drives an embedded sign-out action: it calls `client.signOut()`,
 * which clears the server-side session cookie only — there's no page
 * navigation involved. Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 *
 * This is unrelated to the redirect-mode `<SignOutButton>` (which navigates
 * the whole page to the configured logout URL and never touches this hook,
 * or `useQeetIDClient()`, at all). They're two independent mechanisms for
 * two different provider modes — embedded vs. redirect — not one wrapping
 * the other.
 *
 *   const { status, signOut } = useSignOut();
 *   await signOut();
 */
export function useSignOut(): UseSignOutReturn {
  const client = useQeetIDClient();
  const [status, setStatus] = useState<"idle" | "loading" | "complete" | "error">("idle");
  const [error, setError] = useState<string | undefined>(undefined);

  const signOut = useCallback(async () => {
    if (!client) throw new Error("useSignOut requires apiUrl on <QeetIDProvider>");
    setStatus("loading");
    try {
      await client.signOut();
      setStatus("complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign out failed";
      setError(msg);
      setStatus("error");
    }
  }, [client]);

  return { status, signOut, error };
}
