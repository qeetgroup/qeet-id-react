"use client";

import { useCallback } from "react";

import type { QeetIDClient } from "../../client/client.js";
import type { MfaEnrollmentStatus } from "../../types/auth.js";

type Enrolling = Extract<MfaEnrollmentStatus, { step: "needs_mfa_enrollment" }>;

export interface MfaEnrollmentSteps {
  /** Starts the authenticator app; `status.enrollment` then holds its key and otpauth:// URL. */
  startEnrollment(): Promise<void>;
  /** Confirms the app with a code from it, completing the sign-in; then `status` shows the recovery codes once. */
  confirmEnrollment(params: { code: string }): Promise<void>;
  /** Puts the setup off while the organisation's grace period runs (`status.dueAt`), completing the sign-in. */
  skipEnrollment(): Promise<void>;
  /** Moves on from the recovery codes to `complete`. */
  finish(): void;
}

function message(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// The client and the pending enrolment challenge, or null when there is none.
function enrolling(client: QeetIDClient | null, status: { step: string }, hookName: string): [QeetIDClient, Enrolling] | null {
  if (!client) throw new Error(`${hookName} requires apiUrl on <QeetIDProvider>`);
  return status.step === "needs_mfa_enrollment" ? [client, status as Enrolling] : null;
}

/**
 * The steps of setting up a second factor that `useSignIn` and `useSignUp`
 * share, for an organisation that requires one: they keep the challenge (and
 * the last error) in `status` rather than dropping back to the form.
 */
export function useMfaEnrollmentSteps(
  client: QeetIDClient | null,
  status: { step: string },
  setStatus: (next: MfaEnrollmentStatus | { step: "complete" }) => void,
  hookName: string,
): MfaEnrollmentSteps {
  const startEnrollment = useCallback(async () => {
    const pending = enrolling(client, status, hookName);
    if (!pending) return;
    const [api, current] = pending;
    try {
      const enrollment = await api.startMfaEnrollment(current.mfaToken);
      setStatus({ ...current, enrollment, error: undefined });
    } catch (e) {
      setStatus({ ...current, error: message(e, "Could not start setting up the authenticator app") });
    }
  }, [client, status, setStatus, hookName]);

  const confirmEnrollment = useCallback(
    async ({ code }: { code: string }) => {
      const pending = enrolling(client, status, hookName);
      if (!pending) return;
      const [api, current] = pending;
      try {
        const { recoveryCodes } = await api.verifyMfa({ mfaToken: current.mfaToken, code });
        setStatus(recoveryCodes.length > 0 ? { step: "recovery_codes", codes: recoveryCodes } : { step: "complete" });
      } catch (e) {
        setStatus({ ...current, error: message(e, "That code didn't work") });
      }
    },
    [client, status, setStatus, hookName],
  );

  const skipEnrollment = useCallback(async () => {
    const pending = enrolling(client, status, hookName);
    if (!pending || !pending[1].dueAt) return;
    const [api, current] = pending;
    try {
      await api.skipMfaEnrollment(current.mfaToken);
      setStatus({ step: "complete" });
    } catch (e) {
      setStatus({ ...current, error: message(e, "The setup can't be skipped") });
    }
  }, [client, status, setStatus, hookName]);

  const finish = useCallback(() => {
    if (status.step === "recovery_codes") setStatus({ step: "complete" });
  }, [status, setStatus]);

  return { startEnrollment, confirmEnrollment, skipEnrollment, finish };
}
