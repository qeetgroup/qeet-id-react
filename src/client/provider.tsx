"use client";

import { useMemo } from "react";
import { DEFAULT_LOGIN_URL, DEFAULT_LOGOUT_URL, DEFAULT_SIGNUP_URL } from "../constants/auth.js";
import type { QeetIDState } from "../types/auth.js";
import { AppearanceContext, ClientContext, PathsContext, StateContext } from "./context.js";
import { QeetIDClient } from "./client.js";
import type { QeetIDProviderProps } from "./config.js";

/**
 * The root provider — wrap your app once. Every hook and component in this
 * package reads from the context it sets up.
 *
 *   <QeetIDProvider apiUrl="https://api.id.qeet.in">
 *     <App />
 *   </QeetIDProvider>
 */
export function QeetIDProvider({
  children,
  initialState,
  loginUrl = DEFAULT_LOGIN_URL,
  logoutUrl = DEFAULT_LOGOUT_URL,
  signUpUrl = DEFAULT_SIGNUP_URL,
  apiUrl,
  appearance,
}: QeetIDProviderProps) {
  const state: QeetIDState = {
    isLoaded: true,
    isAuthenticated: initialState?.isAuthenticated ?? false,
    userId: initialState?.userId,
    tenantId: initialState?.tenantId,
    sessionId: initialState?.sessionId,
    user: initialState?.user ?? null,
  };

  const client = useMemo(() => (apiUrl ? new QeetIDClient({ apiUrl }) : null), [apiUrl]);

  return (
    <AppearanceContext.Provider value={appearance}>
      <ClientContext.Provider value={client}>
        <PathsContext.Provider value={{ loginUrl, logoutUrl, signUpUrl }}>
          <StateContext.Provider value={state}>{children}</StateContext.Provider>
        </PathsContext.Provider>
      </ClientContext.Provider>
    </AppearanceContext.Provider>
  );
}
