"use client";

import { useState, useCallback } from "react";

import { useQeetIDClient } from "../../client/context.js";
import type { SignInStatus } from "../../types/auth.js";
import { type MfaEnrollmentSteps, useMfaEnrollmentSteps } from "./mfaEnrollmentSteps.js";

export interface UseSignInReturn extends Omit<MfaEnrollmentSteps, "confirmEnrollment"> {
  status: SignInStatus;
  signIn(params: { email: string; password: string }): Promise<void>;
  /** Completes the second factor: a code for `needs_mfa`, or the code confirming the app set up for `needs_mfa_enrollment`. */
  verifyMfa(params: { code: string; remember?: boolean }): Promise<void>;
  reset(): void;
}

/**
 * useSignIn drives an email+password sign-in flow with optional MFA.
 * Requires `apiUrl` on <QeetIDProvider> (embedded mode).
 *
 *   const { status, signIn, verifyMfa } = useSignIn();
 *   await signIn({ email, password });
 *   if (status.step === "needs_mfa") await verifyMfa({ code });
 *
 * Where the organisation requires MFA and the account has no second factor,
 * `status.step` is `needs_mfa_enrollment`: `startEnrollment()`, show
 * `status.enrollment`, then `verifyMfa({ code })` — or `skipEnrollment()`
 * while `status.dueAt` is set. A `recovery_codes` step follows the setup;
 * `finish()` once they are saved.
 */
export function useSignIn(): UseSignInReturn {
  const client = useQeetIDClient();
  const [status, setStatus] = useState<SignInStatus>({ step: "idle" });

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!client) throw new Error("useSignIn requires apiUrl on <QeetIDProvider>");
      setStatus({ step: "loading" });
      try {
        const result = await client.signIn({ email, password });
        if (result.status === "needs_mfa" && result.enrollmentRequired) {
          setStatus({ step: "needs_mfa_enrollment", mfaToken: result.mfaToken, dueAt: result.enrollmentDueAt });
        } else if (result.status === "needs_mfa") {
          setStatus({ step: "needs_mfa", mfaToken: result.mfaToken });
        } else {
          setStatus({ step: "complete" });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign in failed";
        setStatus({ step: "error", error: msg });
      }
    },
    [client],
  );

  const enrollment = useMfaEnrollmentSteps(client, status, setStatus, "useSignIn");
  const { confirmEnrollment } = enrollment;

  const verifyMfa = useCallback(
    async ({ code, remember }: { code: string; remember?: boolean }) => {
      if (!client) throw new Error("useSignIn requires apiUrl on <QeetIDProvider>");
      if (status.step === "needs_mfa_enrollment") return confirmEnrollment({ code });
      if (status.step !== "needs_mfa") return;
      setStatus({ step: "loading" });
      try {
        await client.verifyMfa({ mfaToken: status.mfaToken, code, remember });
        setStatus({ step: "complete" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "MFA verification failed";
        setStatus({ step: "error", error: msg });
      }
    },
    [client, status, confirmEnrollment],
  );

  const reset = useCallback(() => setStatus({ step: "idle" }), []);

  return {
    status,
    signIn,
    verifyMfa,
    startEnrollment: enrollment.startEnrollment,
    skipEnrollment: enrollment.skipEnrollment,
    finish: enrollment.finish,
    reset,
  };
}
