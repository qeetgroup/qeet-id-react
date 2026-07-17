// Thin wrappers around the browser WebAuthn ceremony used by passkey sign-in
// and enrollment. They convert the backend's JSON options into the
// structured credential-request/creation options (preferring the native
// parse*OptionsFromJSON helpers where available) and return the assertion/
// attestation as JSON ready to POST back. Ceremony failures surface as
// WebAuthnError so callers can tell "unsupported"/"cancelled" apart from
// transport errors.

import { WebAuthnError } from "../errors/AuthenticationError.js";

type PublicKeyCredentialWithJSON = PublicKeyCredential & { toJSON?: () => unknown };

type PKCStatic = typeof PublicKeyCredential & {
  parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
  parseCreationOptionsFromJSON?: (o: unknown) => PublicKeyCredentialCreationOptions;
};

/** True when the current browser can perform passkey ceremonies. */
export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined" && !!navigator.credentials;
}

function pkc(): PKCStatic {
  if (!isWebAuthnSupported()) {
    throw new WebAuthnError("unsupported", "Passkeys aren't supported in this browser.");
  }
  return window.PublicKeyCredential as PKCStatic;
}

// Classifies a thrown WebAuthn ceremony error. Per the WebAuthn spec the
// browser reports BOTH a deliberate user cancellation and a ceremony timeout
// as a `NotAllowedError` (the two are intentionally indistinguishable for
// privacy), so only that maps to "cancelled". Every other DOMException
// (InvalidStateError, NotSupportedError, SecurityError, AbortError,
// ConstraintError, …) is a genuine "failed" — previously all of these were
// mislabeled "cancelled".
function ceremonyError(e: unknown, fallback: { cancelled: string; failed: string }): WebAuthnError {
  const err = e as { name?: string; message?: string };
  if (err?.name === "NotAllowedError") {
    return new WebAuthnError("cancelled", err.message || fallback.cancelled);
  }
  return new WebAuthnError("failed", err?.message || fallback.failed);
}

/** Runs an authentication assertion for login/MFA and returns it as JSON. */
export async function getAssertion(publicKey: unknown): Promise<unknown> {
  const PK = pkc();
  const options = PK.parseRequestOptionsFromJSON ? PK.parseRequestOptionsFromJSON(publicKey) : (publicKey as PublicKeyCredentialRequestOptions);
  let assertion: PublicKeyCredentialWithJSON | null;
  try {
    assertion = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredentialWithJSON | null;
  } catch (e) {
    throw ceremonyError(e, { cancelled: "Passkey request was cancelled.", failed: "Passkey request failed." });
  }
  if (!assertion) throw new WebAuthnError("cancelled", "No passkey was selected.");
  return assertion.toJSON ? assertion.toJSON() : assertion;
}

/** Creates a new credential (passkey enrollment) and returns it as JSON. */
export async function createCredential(publicKey: unknown): Promise<unknown> {
  const PK = pkc();
  const options = PK.parseCreationOptionsFromJSON ? PK.parseCreationOptionsFromJSON(publicKey) : (publicKey as PublicKeyCredentialCreationOptions);
  let credential: PublicKeyCredentialWithJSON | null;
  try {
    credential = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredentialWithJSON | null;
  } catch (e) {
    throw ceremonyError(e, { cancelled: "Passkey creation was cancelled.", failed: "Passkey creation failed." });
  }
  if (!credential) throw new WebAuthnError("failed", "Passkey creation failed.");
  return credential.toJSON ? credential.toJSON() : credential;
}
