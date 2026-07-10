"use client";

import { useState, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";
import type { SignUpStatus } from "../../types/auth.js";

export interface UseSignUpReturn {
  status: SignUpStatus;
  signUp(params: { email: string; password: string; displayName?: string; tenantId?: string }): Promise<void>;
  reset(): void;
}

/**
 * useSignUp drives a new-account registration flow.
 * Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 *
 *   const { status, signUp } = useSignUp();
 *   await signUp({ email, password, displayName });
 */
export function useSignUp(): UseSignUpReturn {
  const client = useQeetIDClient();
  const [status, setStatus] = useState<SignUpStatus>({ step: "idle" });

  const signUp = useCallback(
    async ({
      email,
      password,
      displayName,
      tenantId,
    }: {
      email: string;
      password: string;
      displayName?: string;
      tenantId?: string;
    }) => {
      if (!client) throw new Error("useSignUp requires apiUrl on <QeetIDProvider>");
      setStatus({ step: "loading" });
      try {
        await client.signUp({ email, password, displayName, tenantId });
        setStatus({ step: "complete" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign up failed";
        setStatus({ step: "error", error: msg });
      }
    },
    [client],
  );

  const reset = useCallback(() => setStatus({ step: "idle" }), []);

  return { status, signUp, reset };
}
