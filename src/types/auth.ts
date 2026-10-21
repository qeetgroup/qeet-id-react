import type { QeetIDUser } from "./user.js";

/** The auth state every component/hook reads from `<QeetIDProvider>`'s context. */
export interface QeetIDState {
  /** False during the brief window before the provider mounts. */
  isLoaded: boolean;
  isAuthenticated: boolean;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  user?: QeetIDUser | null;
}

/**
 * A pending second-factor challenge. With `enrollmentRequired` the account
 * must have a second factor and holds none (its organisation requires MFA):
 * set up an authenticator app with `startMfaEnrollment` and complete the
 * challenge with a code from it. `enrollmentDueAt`, when present, is when the
 * organisation's grace period ends; until then `skipMfaEnrollment` signs in
 * without one.
 */
export type MfaChallenge = {
  status: "needs_mfa";
  mfaToken: string;
  methods: string[];
  enrollmentRequired?: true;
  enrollmentDueAt?: string;
};

/** The outcome of a password sign-in: either the session is established ("complete") or a second factor is required ("needs_mfa"). */
export type SignInResult = { status: "complete"; userId?: string } | MfaChallenge;

/** The outcome of a registration: the session is established, or — where the organisation requires MFA — an authenticator app is set up first. */
export type SignUpResult = { status: "complete" } | MfaChallenge;

/** An authenticator app being set up for a challenge: the key to enter, or the otpauth:// URL to open or scan. */
export type MfaEnrollment = { secret: string; provisioningUrl: string };

/** What completing a challenge returned: the new recovery codes when it set up an authenticator app (shown once), otherwise none. */
export type VerifyMfaResult = { recoveryCodes: string[] };

export type SignInParams = { email: string; password: string };
export type SignUpParams = { tenantId?: string; email: string; password: string; displayName?: string };
export type VerifyMfaParams = { mfaToken: string; code: string; remember?: boolean };
export type ForgotPasswordParams = { email: string; tenantId?: string };
export type ResetPasswordParams = { token: string; newPassword: string };
export type MagicLinkStartParams = { email: string; tenantId?: string };
export type SocialStartParams = { provider: string; tenantId: string; returnTo: string };

/**
 * The steps of setting up a second factor during sign-in or sign-up, when the
 * organisation requires one: `needs_mfa_enrollment` (start the app, then
 * confirm it with a code — `enrollment` is set once started; `dueAt` while
 * the setup may be skipped; `error` from the last attempt), then
 * `recovery_codes` to show once before finishing.
 */
export type MfaEnrollmentStatus =
  | { step: "needs_mfa_enrollment"; mfaToken: string; dueAt?: string; enrollment?: MfaEnrollment; error?: string }
  | { step: "recovery_codes"; codes: string[] };

/** Drives `<SignIn/>`/`useSignIn`'s step-by-step UI state. */
export type SignInStatus =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "needs_mfa"; mfaToken: string }
  | MfaEnrollmentStatus
  | { step: "complete" }
  | { step: "error"; error: string };

/** Drives `<SignUp/>`/`useSignUp`'s step-by-step UI state. */
export type SignUpStatus =
  | { step: "idle" }
  | { step: "loading" }
  | MfaEnrollmentStatus
  | { step: "complete" }
  | { step: "error"; error: string };

/** Drives `useMFA`'s standalone step-up verification state. */
export type MfaStatus = { step: "idle" } | { step: "loading" } | { step: "complete" } | { step: "error"; error: string };
