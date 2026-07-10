"use client";

import { useState, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";
import type { MfaStatus } from "../../types/auth.js";

export interface UseMFAReturn {
  status: MfaStatus;
  /** Verify a pending MFA challenge (during sign-in; prefer useSignIn.verifyMfa for most cases). */
  verify(params: { mfaToken: string; code: string; remember?: boolean }): Promise<void>;
  reset(): void;
}

/**
 * useMFA provides a standalone MFA verification action. For the common sign-in
 * MFA step, use `useSignIn` which wraps the full flow. useMFA is useful for
 * step-up authentication in already-signed-in contexts.
 * Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 */
export function useMFA(): UseMFAReturn {
  const client = useQeetIDClient();
  const [status, setStatus] = useState<MfaStatus>({ step: "idle" });

  const verify = useCallback(
    async ({
      mfaToken,
      code,
      remember,
    }: {
      mfaToken: string;
      code: string;
      remember?: boolean;
    }) => {
      if (!client) throw new Error("useMFA requires apiUrl on <QeetIDProvider>");
      setStatus({ step: "loading" });
      try {
        await client.verifyMfa({ mfaToken, code, remember });
        setStatus({ step: "complete" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "MFA verification failed";
        setStatus({ step: "error", error: msg });
      }
    },
    [client],
  );

  const reset = useCallback(() => setStatus({ step: "idle" }), []);

  return { status, verify, reset };
}
