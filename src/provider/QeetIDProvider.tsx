"use client";

import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BASE_PATH, parseSession, type Session, sessionRoutes } from "../contract";
import { warnOnce } from "../core/development";
import { assignLocation } from "../core/navigation";
import { type SessionEndReason, type SessionEvents, SessionStore } from "../core/store";
import { fetchTransport } from "../core/transport";
import type { QeetIDError } from "../errors";
import { QeetIDContext, type QeetIDContextValue } from "./context";
import { defaultLocalization, type QeetIDLocalization } from "./localization";

/** Props of `<QeetIDProvider>`. */
export interface QeetIDProviderProps {
  children?: ReactNode;
  /**
   * Where the app's session routes live: a path on this site, `/auth` by
   * default, so the session is read from `/auth/session`. Must match the
   * server. Fixed for the provider's life.
   */
  basePath?: string;
  /**
   * The session the server rendered the page with: a `Session`, or `null` for
   * nobody signed in. With it, the first render already knows (no flicker, no
   * hydration mismatch, no request on load). Leave it out when the server
   * doesn't render the page; the provider then asks `{basePath}/session`.
   */
  initialSession?: Session | null;
  /** Check the session again when the tab regains focus. Default `true`. */
  refetchOnWindowFocus?: boolean;
  /** Check the session again when the browser comes back online. Default `true`. */
  refetchOnReconnect?: boolean;
  /** Tell the app's other tabs about a sign-out or a switch, and listen to theirs. Default `true`. */
  syncTabs?: boolean;
  /** Strings to use instead of the English defaults. */
  localization?: Partial<QeetIDLocalization>;
  /**
   * Called when the session changes after the provider first knew it: a
   * sign-out, an expiry or revocation, an organisation switch, someone else
   * signing in, or a refreshed profile. Clear the app's data caches here when
   * the user or organisation changed. Not called for the first answer.
   */
  onSessionChange?: (session: Session | null, previousSession: Session | null) => void;
  /** Called when a session this page knew about ends, with why. */
  onSignOut?: (reason: SessionEndReason) => void;
  /** Called when a check or an action fails, and when the callback reported a failed sign-in. */
  onError?: (error: QeetIDError) => void;
}

/**
 * Makes the session available to the hooks and components. Put it once near
 * the root of the app.
 *
 * It talks only to the app's own session routes, never to Qeet ID, and never
 * holds a token. It asks `GET {basePath}/session` on load (unless
 * `initialSession` was given), when the tab regains focus, when the browser
 * comes back online and when the session reaches `expiresAt`.
 *
 * ```tsx
 * <QeetIDProvider initialSession={session}>
 *   <App />
 * </QeetIDProvider>
 * ```
 */
export function QeetIDProvider({
  children,
  basePath = DEFAULT_BASE_PATH,
  initialSession,
  refetchOnWindowFocus = true,
  refetchOnReconnect = true,
  syncTabs = true,
  localization,
  onSessionChange,
  onSignOut,
  onError,
}: QeetIDProviderProps): ReactElement {
  const events = useRef<SessionEvents>({});
  events.current = { onSessionChange, onSignOut, onError };

  const [store] = useState(() => {
    const routes = sessionRoutes(basePath);
    return new SessionStore({
      routes,
      transport: fetchTransport(routes),
      navigate: assignLocation,
      initialSession: initialSession === undefined ? undefined : checkedInitialSession(initialSession),
      refetchOnWindowFocus,
      refetchOnReconnect,
      syncTabs,
      readAuthError: true,
      events: () => events.current,
    });
  });

  if (store.routes.session !== sessionRoutes(basePath).session) {
    warnOnce("basePath changed after <QeetIDProvider> mounted; it keeps the first one. Give the provider a `key` to start over.");
  }

  useEffect(() => store.start(), [store]);

  // A newer server render (a router refresh, say) replaces what is known.
  const rendered = useRef(initialSession);
  useEffect(() => {
    if (initialSession === undefined || initialSession === rendered.current) return;
    rendered.current = initialSession;
    store.hydrate(checkedInitialSession(initialSession));
  }, [initialSession, store]);

  // Keyed on the strings, not the object: an inline `localization={{…}}` doesn't re-render every consumer.
  const strings = localization === undefined ? "" : JSON.stringify(localization);
  const value = useMemo<QeetIDContextValue>(
    () => ({ store, localization: Object.freeze({ ...defaultLocalization, ...(strings === "" ? {} : JSON.parse(strings)) }) }),
    [store, strings],
  );

  return <QeetIDContext.Provider value={value}>{children}</QeetIDContext.Provider>;
}

function checkedInitialSession(value: Session | null): Session | null {
  if (value === null) return null;
  try {
    return parseSession(value);
  } catch (error) {
    throw new TypeError(`<QeetIDProvider initialSession> isn't a session: ${(error as Error).message}`, { cause: error });
  }
}
