"use client";

import { useEffect, useRef } from "react";

import { useQeetIDClient } from "../../client/context.js";

export interface UsePasskeyAutofillOptions {
  /** Runs once the passkey the user picked from the browser prompt has signed in. */
  onSignedIn(): void;
  /** Runs when the server refuses the passkey the user picked. */
  onError?(error: unknown): void;
}

export interface UsePasskeyAutofillReturn {
  /** Stops the background ceremony; call it before signing in another way. */
  stop(): void;
}

/**
 * usePasskeyAutofill offers the user's passkeys in the browser's own autofill
 * prompt while a sign-in form is shown, and signs in with the one they pick —
 * nothing typed. Give the form's email field autocomplete="username webauthn".
 * Does nothing where the browser lacks conditional mediation; a dismissed or
 * stopped prompt is never an error. Requires `apiUrl` on <QeetIDProvider>.
 *
 *   const { stop } = usePasskeyAutofill({ onSignedIn: () => router.push("/") });
 *   // call stop() before a password or social sign-in
 */
export function usePasskeyAutofill({ onSignedIn, onError }: UsePasskeyAutofillOptions): UsePasskeyAutofillReturn {
  const client = useQeetIDClient();
  const controller = useRef<AbortController | null>(null);
  const callbacks = useRef({ onSignedIn, onError });
  callbacks.current = { onSignedIn, onError };

  useEffect(() => {
    if (!client) return;
    const c = new AbortController();
    controller.current = c;
    client.passkeys
      .autofill(c.signal)
      .then((signedIn) => {
        if (signedIn) callbacks.current.onSignedIn();
      })
      .catch((err: unknown) => callbacks.current.onError?.(err));
    return () => c.abort();
  }, [client]);

  return { stop: () => controller.current?.abort() };
}
