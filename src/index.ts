/**
 * React hooks and prebuilt components for Qeet ID — the passkeys-first
 * identity platform. Wrap your app once in `<QeetIDProvider>`, then use
 * hooks (`useAuth`, `useUser`, `useSignIn`, ...) for headless integrations
 * or prebuilt components (`<SignInButton/>`, `<UserButton/>`, `<SignIn/>`)
 * for a drop-in UI.
 *
 *   import { QeetIDProvider, SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@qeet-id/react";
 *
 *   function App() {
 *     return (
 *       <QeetIDProvider loginUrl="/api/auth/login" logoutUrl="/api/auth/logout">
 *         <SignedIn><Dashboard /></SignedIn>
 *         <SignedOut><SignInButton /></SignedOut>
 *       </QeetIDProvider>
 *     );
 *   }
 *
 * Two provider modes: pass `apiUrl` for embedded mode (hooks/forms drive
 * auth directly against the API, no redirect); omit it for redirect mode
 * (`<SignInButton>` etc. navigate to your own hosted-login routes). See
 * docs/architecture/ARCHITECTURE.md.
 */
export { QeetIDClient, QeetIDProvider, useQeetIDState, usePaths, useQeetIDClient, useAppearance, isWebAuthnSupported } from "./client/index.js";
export type { QeetIDClientOptions, QeetIDProviderProps } from "./client/index.js";

export { AuthenticationError, WebAuthnError } from "./errors/index.js";

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, DEFAULT_LOGIN_URL, DEFAULT_LOGOUT_URL, DEFAULT_SIGNUP_URL } from "./constants/index.js";

export { readCookie, getStoredPreference, setStoredPreference, describeSession, getQueryToken, isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH, base64UrlDecode, base64UrlEncode } from "./utils/index.js";

export type {
  QeetIDUser,
  Organization,
  Session,
  Passkey,
  QeetIDState,
  SignInResult,
  SignInParams,
  SignUpParams,
  VerifyMfaParams,
  ForgotPasswordParams,
  ResetPasswordParams,
  MagicLinkStartParams,
  SocialStartParams,
  SignInStatus,
  SignUpStatus,
  MfaStatus,
  Branding,
  LoginContext,
  Appearance,
  AppearanceTheme,
  AppearanceVariables,
  AppearanceElements,
} from "./types/index.js";

export * from "./hooks/index.js";
export * from "./components/index.js";
export * from "./widgets/index.js";
