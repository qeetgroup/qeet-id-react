"use client";

import { useState, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";
import type { SignUpStatus } from "../../types/auth.js";
import { type MfaEnrollmentSteps, useMfaEnrollmentSteps } from "./mfaEnrollmentSteps.js";

export interface UseSignUpReturn extends Omit<MfaEnrollmentSteps, "confirmEnrollment"> {
  status: SignUpStatus;
  signUp(params: { email: string; password: string; displayName?: string; tenantId?: string }): Promise<void>;
  /** Confirms the authenticator app set up for `needs_mfa_enrollment` with a code from it. */
  verifyMfa(params: { code: string }): Promise<void>;
  reset(): void;
}

/**
 * useSignUp drives a new-account registration flow.
 * Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 *
 *   const { status, signUp } = useSignUp();
 *   await signUp({ email, password, displayName });
 *
 * Where the organisation requires MFA, `status.step` becomes
 * `needs_mfa_enrollment`: `startEnrollment()`, show `status.enrollment`, then
 * `verifyMfa({ code })`; a `recovery_codes` step follows — `finish()` once
 * they are saved.
 */
export function useSignUp(): UseSignUpReturn {
  const client = useQeetIDClient();
  const [status, setStatus] = useState<SignUpStatus>({ step: "idle" });

  const signUp = useCallback(
    async ({ email, password, displayName, tenantId }: { email: string; password: string; displayName?: string; tenantId?: string }) => {
      if (!client) throw new Error("useSignUp requires apiUrl on <QeetIDProvider>");
      setStatus({ step: "loading" });
      try {
        const result = await client.signUp({ email, password, displayName, tenantId });
        if (result.status === "needs_mfa") {
          setStatus({ step: "needs_mfa_enrollment", mfaToken: result.mfaToken, dueAt: result.enrollmentDueAt });
        } else {
          setStatus({ step: "complete" });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign up failed";
        setStatus({ step: "error", error: msg });
      }
    },
    [client],
  );

  const enrollment = useMfaEnrollmentSteps(client, status, setStatus, "useSignUp");

  const reset = useCallback(() => setStatus({ step: "idle" }), []);

  return {
    status,
    signUp,
    verifyMfa: enrollment.confirmEnrollment,
    startEnrollment: enrollment.startEnrollment,
    skipEnrollment: enrollment.skipEnrollment,
    finish: enrollment.finish,
    reset,
  };
}
