"use client";

import { createContext, useContext } from "react";
import type { Appearance } from "../types/common.js";
import type { QeetIDState } from "../types/auth.js";
import type { QeetIDClient } from "./client.js";

export const StateContext = createContext<QeetIDState>({ isLoaded: false, isAuthenticated: false });
export const PathsContext = createContext<{ loginUrl: string; logoutUrl: string; signUpUrl: string }>({
  loginUrl: "/api/auth/login",
  logoutUrl: "/api/auth/logout",
  signUpUrl: "/api/auth/sign-up",
});
export const ClientContext = createContext<QeetIDClient | null>(null);
export const AppearanceContext = createContext<Appearance | undefined>(undefined);

/** The auth state every component/hook in this package ultimately reads. */
export function useQeetIDState(): QeetIDState {
  return useContext(StateContext);
}

/** The hosted-login redirect paths configured on `<QeetIDProvider>`. */
export function usePaths(): { loginUrl: string; logoutUrl: string; signUpUrl: string } {
  return useContext(PathsContext);
}

/** The embedded-mode API client, or null when `<QeetIDProvider>` wasn't given `apiUrl` (redirect-only mode). */
export function useQeetIDClient(): QeetIDClient | null {
  return useContext(ClientContext);
}

/** Theming/styling overrides configured on `<QeetIDProvider>`. */
export function useAppearance(): Appearance | undefined {
  return useContext(AppearanceContext);
}
