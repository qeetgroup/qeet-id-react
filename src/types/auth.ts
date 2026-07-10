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

/** The outcome of a password sign-in: either the session is established ("complete") or a second factor is required ("needs_mfa"). */
export type SignInResult = { status: "complete"; userId?: string } | { status: "needs_mfa"; mfaToken: string; methods: string[] };

export type SignInParams = { email: string; password: string };
export type SignUpParams = { tenantId?: string; email: string; password: string; displayName?: string };
export type VerifyMfaParams = { mfaToken: string; code: string; remember?: boolean };
export type ForgotPasswordParams = { email: string; tenantId?: string };
export type ResetPasswordParams = { token: string; newPassword: string };
export type MagicLinkStartParams = { email: string; tenantId?: string };
export type SocialStartParams = { provider: string; tenantId: string; returnTo: string };

/** Drives `<SignIn/>`/`useSignIn`'s step-by-step UI state. */
export type SignInStatus = { step: "idle" } | { step: "loading" } | { step: "needs_mfa"; mfaToken: string } | { step: "complete" } | { step: "error"; error: string };

/** Drives `<SignUp/>`/`useSignUp`'s step-by-step UI state. */
export type SignUpStatus = { step: "idle" } | { step: "loading" } | { step: "complete" } | { step: "error"; error: string };

/** Drives `useMFA`'s standalone step-up verification state. */
export type MfaStatus = { step: "idle" } | { step: "loading" } | { step: "complete" } | { step: "error"; error: string };
