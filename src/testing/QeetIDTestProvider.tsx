"use client";

import { type ReactElement, type ReactNode, useMemo, useRef, useState } from "react";
import { DEFAULT_BASE_PATH, parseSession, type Session, sessionRoutes } from "../contract";
import { type SessionEndReason, type SessionEvents, type SessionState, SessionStore, stateFor } from "../core/store";
import type { SessionTransport } from "../core/transport";
import { QeetIDError } from "../errors";
import { QeetIDContext, type QeetIDContextValue } from "../provider/context";
import { defaultLocalization, type QeetIDLocalization } from "../provider/localization";

/** Props of `<QeetIDTestProvider>`. */
export interface QeetIDTestProviderProps {
  children?: ReactNode;
  /** The session to render with: a `Session` (see `createTestSession`), or `null` for signed out (the default). */
  session?: Session | null;
  /** Render as still `loading`, or as `unavailable` (the first check failed), instead of with `session`. */
  status?: "loading" | "unavailable";
  /** The base path the routes are under, as on `<QeetIDProvider>`. */
  basePath?: string;
  /** Strings to use instead of the English defaults. */
  localization?: Partial<QeetIDLocalization>;
  /** Receives every page navigation the SDK would make (sign-in, sign-up, sign-out's redirect), instead of the page moving. */
  onNavigate?: (url: string) => void;
  /**
   * Answers a switch of organisation: return the new session, or throw (a
   * `QeetIDError`, say) to fail it. By default the session moves to the
   * organisation with that id, with no name, roles or permissions.
   */
  onSwitchOrganization?: (organizationId: string) => Session | Promise<Session>;
  /** Fails sign-out with this error instead of signing out. */
  signOutError?: QeetIDError;
  /** As on `<QeetIDProvider>`. */
  onSessionChange?: (session: Session | null, previousSession: Session | null) => void;
  /** As on `<QeetIDProvider>`. */
  onSignOut?: (reason: SessionEndReason) => void;
  /** As on `<QeetIDProvider>`. */
  onError?: (error: QeetIDError) => void;
}

/**
 * Renders components with a session you choose, without a server: the hooks
 * and components behave as under `<QeetIDProvider>`, but nothing is fetched,
 * no listener is attached and the page never moves.
 *
 * ```tsx
 * import { QeetIDTestProvider, createTestSession } from "@qeet-id/react/testing";
 *
 * render(
 *   <QeetIDTestProvider session={createTestSession({ permissions: [] })} onNavigate={navigate}>
 *     <InvoiceToolbar />
 *   </QeetIDTestProvider>,
 * );
 * ```
 */
export function QeetIDTestProvider({
  children,
  session = null,
  status,
  basePath = DEFAULT_BASE_PATH,
  localization,
  onNavigate,
  onSwitchOrganization,
  signOutError,
  onSessionChange,
  onSignOut,
  onError,
}: QeetIDTestProviderProps): ReactElement {
  const props = useRef({ onNavigate, onSwitchOrganization, signOutError });
  props.current = { onNavigate, onSwitchOrganization, signOutError };
  const events = useRef<SessionEvents>({});
  events.current = { onSessionChange, onSignOut, onError };

  const [store] = useState(() => {
    const initial = session === null ? null : parseSession(session);
    let current = initial;
    const transport: SessionTransport = {
      getSession: () => (status === "loading" ? new Promise<never>(() => {}) : Promise.resolve(current)),
      signOut: async () => {
        const failure = props.current.signOutError;
        if (failure !== undefined) throw failure;
        current = null;
        return { redirectTo: "/" };
      },
      switchOrganization: async ({ organizationId }) => {
        const answer = props.current.onSwitchOrganization;
        const next =
          answer !== undefined
            ? parseSession(await answer(organizationId))
            : parseSession({ ...current, organization: { id: organizationId, name: null }, roles: [], permissions: [] });
        current = next;
        return next;
      },
    };
    return new SessionStore({
      routes: sessionRoutes(basePath),
      transport,
      navigate: (url) => props.current.onNavigate?.(url),
      initialState: initialState(status, initial),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      syncTabs: false,
      readAuthError: false,
      events: () => events.current,
    });
  });

  const strings = localization === undefined ? "" : JSON.stringify(localization);
  const value = useMemo<QeetIDContextValue>(
    () => ({ store, localization: Object.freeze({ ...defaultLocalization, ...(strings === "" ? {} : JSON.parse(strings)) }) }),
    [store, strings],
  );
  return <QeetIDContext.Provider value={value}>{children}</QeetIDContext.Provider>;
}

function initialState(status: "loading" | "unavailable" | undefined, session: Session | null): SessionState {
  if (status === "loading") return stateFor(undefined);
  if (status === "unavailable") {
    return Object.freeze({
      ...stateFor(undefined),
      status: "unavailable",
      error: new QeetIDError("The session check got no response.", { code: "network_error" }),
    });
  }
  return stateFor(session);
}
