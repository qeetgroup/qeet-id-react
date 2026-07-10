import type { ReactNode } from "react";
import type { Appearance } from "../types/common.js";
import type { QeetIDState } from "../types/auth.js";

export interface QeetIDProviderProps {
  children: ReactNode;
  /**
   * Auth state computed on the server (e.g. from a Next.js server component
   * reading the session cookie), passed down so the client renders
   * correctly on first paint without waiting on a `currentUser()` round
   * trip.
   */
  initialState?: Partial<QeetIDState>;
  /** Where `<SignInButton>` sends the browser. Default `/api/auth/login`. */
  loginUrl?: string;
  /** Where `<SignOutButton>` sends the browser. Default `/api/auth/logout`. */
  logoutUrl?: string;
  /** Where `<SignUpButton>` sends the browser. Default `/api/auth/sign-up`. */
  signUpUrl?: string;
  /**
   * Qeet ID API base URL for embedded mode (e.g. "https://api.id.qeet.in").
   * When set, `<SignIn/>`, `<SignUp/>`, and every hook in this package
   * drive authentication directly against the API instead of redirecting
   * to the hosted login. Omit it to use only the redirect-based
   * `<SignInButton>`/`<SignUpButton>`/`<SignOutButton>` + `useAuth`/`useUser`.
   */
  apiUrl?: string;
  /** Appearance/theming overrides for prebuilt components. */
  appearance?: Appearance;
}
