import { AUTH_ERROR_PARAMETER, type Session, type SessionRoutes, safeReturnTo } from "../contract";
import { QeetIDError } from "../errors";
import { warnOnce } from "./development";
import { type Navigate, type SignInOptions, signInUrl } from "./navigation";
import { openTabChannel, type TabChannel, type TabMessage } from "./tabs";
import type { SessionTransport } from "./transport";

/**
 * Where the session stands.
 *
 * - `loading`: not known yet; the first check is on its way.
 * - `signed-in` / `signed-out`: what the server said last.
 * - `unavailable`: the first check failed, so nobody knows. `error` says why;
 *   the next focus, reconnection or `refresh()` tries again.
 */
export type SessionStatus = "loading" | "signed-in" | "signed-out" | "unavailable";

/**
 * Why a session this page knew about ended.
 *
 * - `signed-out`: the person signed out, in this tab or another.
 * - `expired`: it reached `expiresAt` and the server didn't renew it.
 * - `revoked`: the server stopped reporting it before then (signed out
 *   everywhere, removed from the organisation, suspended).
 */
export type SessionEndReason = "signed-out" | "expired" | "revoked";

/** An action waiting for the server's answer. */
export type PendingAction = "sign-out" | "switch-organization";

/** A snapshot of the session as the provider knows it. Immutable: a change makes a new one. */
export interface SessionState {
  /** Where the session stands. */
  readonly status: SessionStatus;
  /** The session, or `null` unless `status` is `signed-in`. */
  readonly session: Session | null;
  /**
   * The latest failure, or `null`. A failed check keeps the last known
   * session. A successful check clears a failed check; a successful action
   * clears every error.
   */
  readonly error: QeetIDError | null;
  /** Why the last known session ended, until someone signs in again; otherwise `null`. */
  readonly endReason: SessionEndReason | null;
  /** The action waiting for the server, or `null`. */
  readonly pendingAction: PendingAction | null;
}

/** What `signOut` takes. */
export interface SignOutOptions {
  /** A path on this site to end up on. Defaults to the server's choice; a value on another site is ignored. */
  returnTo?: string;
}

/** The session's actions. Their identities never change, so they are safe in effect dependencies. */
export interface SessionActions {
  /**
   * Sends the page to `{basePath}/sign-in`, which continues to Qeet ID's hosted
   * sign-in and comes back to `returnTo` (the current page by default).
   */
  readonly signIn: (options?: SignInOptions) => void;
  /** Sends the page to `{basePath}/sign-up`. Takes the same options as `signIn`. */
  readonly signUp: (options?: SignInOptions) => void;
  /**
   * Ends the session (`POST {basePath}/sign-out`), tells the other tabs and
   * follows the server's `redirectTo`. Rejects with a `QeetIDError`, leaving the
   * session as it was, when the server refuses.
   */
  readonly signOut: (options?: SignOutOptions) => Promise<void>;
  /**
   * Moves the session to another organisation (`POST
   * {basePath}/switch-organization`) and resolves with the new session. Rejects
   * with a `QeetIDError` when the server refuses (`organization_switch_refused`)
   * or can't (`organization_switch_unavailable`).
   */
  readonly switchOrganization: (organizationId: string) => Promise<Session>;
  /** Asks the server for the session now. Rejects with a `QeetIDError` when the check fails. */
  readonly refresh: () => Promise<Session | null>;
  /** The absolute path of every session route, for links and forms of your own. */
  readonly routes: SessionRoutes;
}

/** The callbacks a store reports to; read again for every event, so they can change. */
export interface SessionEvents {
  onSessionChange?: ((session: Session | null, previousSession: Session | null) => void) | undefined;
  onSignOut?: ((reason: SessionEndReason) => void) | undefined;
  onError?: ((error: QeetIDError) => void) | undefined;
}

/** How a store is set up. */
export interface SessionStoreOptions {
  routes: SessionRoutes;
  transport: SessionTransport;
  navigate: Navigate;
  /** The session the page was rendered with: a session, `null` for nobody, or `undefined` for not known. */
  initialSession?: Session | null | undefined;
  /** The state to start in when it isn't derived from `initialSession` (the testing entry). */
  initialState?: SessionState | undefined;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
  syncTabs: boolean;
  /** Whether to read the callback's `authError` from the address bar on start. */
  readAuthError: boolean;
  events: () => SessionEvents;
}

type ErrorSource = "check" | "action" | "sign-in";
type CheckReason = "initial" | "focus" | "reconnect" | "expiry" | "tab" | "render" | "manual";

/** Checks on focus no more often than this, so a burst of focus and visibility events makes one request. */
export const FOCUS_CHECK_INTERVAL_MS = 5_000;
/** The longest `setTimeout` delay browsers honour. */
const MAX_TIMER_MS = 2_147_483_647;
/** How long after `expiresAt` the expiry check runs, so the server agrees the session has ended. */
const EXPIRY_GRACE_MS = 1_000;
/**
 * Expiry checks run at most this often. When this browser's clock is ahead of
 * the server's, a session can look expired to it while the server still
 * reports it: it asks again a minute later, never in a loop.
 */
export const EXPIRY_RECHECK_MS = 60_000;

/**
 * The session as one provider knows it: an external store for
 * `useSyncExternalStore`, with the actions that change it. Constructing it has
 * no side effects (React may construct one and drop it); `start()` attaches the
 * listeners and `stop()`, the function it returns, detaches them, so
 * StrictMode's second effect run is harmless.
 */
export class SessionStore {
  readonly routes: SessionRoutes;
  readonly #options: SessionStoreOptions;
  readonly #listeners = new Set<() => void>();
  readonly #serverState: SessionState;
  #state: SessionState;
  #errorSource: ErrorSource | null = null;
  #inflight: Promise<Session | null> | null = null;
  #generation = 0;
  #switchToken = 0;
  #pendingSignOut: Promise<void> | null = null;
  #lastCheckStartedAt = Number.NEGATIVE_INFINITY;
  #lastExpiryCheckAt = Number.NEGATIVE_INFINITY;
  #starts = 0;
  #authErrorRead = false;
  #channel: TabChannel | null = null;
  #expiryTimer: ReturnType<typeof setTimeout> | undefined;

  /** The actions, bound once, so every hook hands out the same functions. */
  readonly actions: SessionActions;

  constructor(options: SessionStoreOptions) {
    this.#options = options;
    this.routes = options.routes;
    this.#state = options.initialState ?? stateFor(options.initialSession);
    this.#serverState = this.#state;
    this.actions = Object.freeze({
      signIn: (signInOptions?: SignInOptions) => this.signIn(signInOptions),
      signUp: (signInOptions?: SignInOptions) => this.signUp(signInOptions),
      signOut: (signOutOptions?: SignOutOptions) => this.signOut(signOutOptions),
      switchOrganization: (organizationId: string) => this.switchOrganization(organizationId),
      refresh: () => this.refresh(),
      routes: options.routes,
    });
  }

  /** The current snapshot. */
  readonly getSnapshot = (): SessionState => this.#state;

  /** The snapshot the page was rendered with, for hydration. */
  readonly getServerSnapshot = (): SessionState => this.#serverState;

  /** Calls `listener` after every change; returns the function that stops it. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Attaches the browser listeners and makes the first check when needed. Returns `stop`. */
  start(): () => void {
    this.#starts += 1;
    const detach: Array<() => void> = [];
    const options = this.#options;

    if (options.refetchOnWindowFocus) {
      const onFocus = (): void => {
        if (document.visibilityState === "hidden" || now() - this.#lastCheckStartedAt < FOCUS_CHECK_INTERVAL_MS) return;
        this.#check("focus");
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
      detach.push(() => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onFocus);
      });
    }
    if (options.refetchOnReconnect) {
      const onOnline = (): void => {
        this.#check("reconnect");
      };
      window.addEventListener("online", onOnline);
      detach.push(() => window.removeEventListener("online", onOnline));
    }
    if (options.syncTabs) {
      const channel = openTabChannel(this.routes.session);
      if (channel !== null) {
        this.#channel = channel;
        const stopListening = channel.listen((message) => this.#onTabMessage(message));
        detach.push(() => {
          stopListening();
          channel.close();
          if (this.#channel === channel) this.#channel = null;
        });
      }
    }
    if (options.readAuthError && !this.#authErrorRead) {
      this.#authErrorRead = true;
      this.#readAuthError();
    }
    if (this.#state.status === "loading") this.#check("initial");
    this.#scheduleExpiry();

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      this.#starts -= 1;
      for (const undo of detach) undo();
      if (this.#starts === 0) this.#clearExpiry();
    };
  }

  /**
   * Asks the server for the session now. Checks already on their way are
   * shared. Resolves with the session, or rejects with a `QeetIDError`.
   */
  refresh(): Promise<Session | null> {
    return this.#check("manual");
  }

  /** Sends the whole page to `url` (a path or an http(s) URL), as every action does. */
  navigate(url: string): void {
    this.#options.navigate(url);
  }

  /** Sends the page to the `sign-in` route, which continues to Qeet ID's hosted sign-in. */
  signIn(options?: SignInOptions): void {
    this.#options.navigate(signInUrl(this.routes.signIn, options));
  }

  /** Sends the page to the `sign-up` route. */
  signUp(options?: SignInOptions): void {
    this.#options.navigate(signInUrl(this.routes.signUp, options));
  }

  /**
   * Ends the session (`POST sign-out`), tells the other tabs and follows the
   * server's `redirectTo`. A second call while one is on its way shares it.
   */
  signOut(options?: SignOutOptions): Promise<void> {
    if (this.#pendingSignOut !== null) return this.#pendingSignOut;
    const pending = this.#signOut(options).finally(() => {
      this.#pendingSignOut = null;
    });
    this.#pendingSignOut = pending;
    return pending;
  }

  /**
   * Moves the session to another organisation (`POST switch-organization`)
   * and tells the other tabs. Resolves with the new session. When switches
   * overlap, the last one started decides.
   *
   * @throws {TypeError} when `organizationId` is empty.
   */
  async switchOrganization(organizationId: string): Promise<Session> {
    if (typeof organizationId !== "string" || organizationId === "") {
      throw new TypeError("switchOrganization needs the id of the organisation to switch to.");
    }
    const token = ++this.#switchToken;
    this.#update({ pendingAction: "switch-organization" });
    let session: Session;
    try {
      session = await this.#options.transport.switchOrganization({ organizationId });
    } catch (cause) {
      const error = asQeetIDError(cause, "Switching organisation failed.");
      if (token === this.#switchToken) this.#update({ pendingAction: null });
      this.#fail(error, "action");
      throw error;
    }
    if (token !== this.#switchToken) return session;
    this.#invalidateChecks();
    const previous = this.#state.session;
    const next = share(previous, session);
    this.#errorSource = null;
    this.#set({ status: "signed-in", session: next, error: null, endReason: null, pendingAction: null });
    if (next !== previous) {
      this.#emit("onSessionChange", next, previous);
      this.#channel?.post({ type: "changed" });
    }
    return next;
  }

  /** Takes the session a newer server render reported, as if a check had answered it. */
  hydrate(session: Session | null): void {
    this.#invalidateChecks();
    this.#settle(session, "render");
  }

  async #signOut(options: SignOutOptions | undefined): Promise<void> {
    let returnTo: string | undefined;
    if (options?.returnTo !== undefined) {
      returnTo = safeReturnTo(options.returnTo, window.location.origin);
      if (returnTo === undefined)
        warnOnce(`signOut's returnTo ${JSON.stringify(options.returnTo)} isn't a path on this site, so the server's default is used.`);
    }
    this.#update({ pendingAction: "sign-out" });
    let redirectTo: string;
    try {
      ({ redirectTo } = await this.#options.transport.signOut(returnTo === undefined ? {} : { returnTo }));
    } catch (cause) {
      const error = asQeetIDError(cause, "Signing out failed.");
      this.#update({ pendingAction: null });
      this.#fail(error, "action");
      throw error;
    }
    this.#invalidateChecks();
    const previous = this.#state.session;
    this.#errorSource = null;
    this.#set({ status: "signed-out", session: null, error: null, endReason: "signed-out", pendingAction: null });
    this.#channel?.post({ type: "signed-out" });
    if (previous !== null) {
      this.#emit("onSessionChange", null, previous);
      this.#emit("onSignOut", "signed-out");
    }
    this.#options.navigate(redirectTo);
  }

  #check(reason: CheckReason): Promise<Session | null> {
    if (this.#inflight !== null) return this.#inflight;
    const generation = this.#generation;
    this.#lastCheckStartedAt = now();
    const request = this.#options.transport.getSession().then(
      (session) => {
        if (this.#inflight === request) this.#inflight = null;
        if (generation === this.#generation) this.#settle(session, reason);
        return generation === this.#generation ? this.#state.session : session;
      },
      (cause: unknown) => {
        if (this.#inflight === request) this.#inflight = null;
        const error = asQeetIDError(cause, "The session check failed.");
        if (generation === this.#generation) this.#fail(error, "check");
        // The session may still be over: ask again later rather than never.
        if (reason === "expiry") this.#scheduleExpiry();
        throw error;
      },
    );
    this.#inflight = request;
    // A background check's failure is already in `error` and `onError`.
    if (reason !== "manual") request.catch(ignore);
    return request;
  }

  #settle(session: Session | null, reason: CheckReason): void {
    const before = this.#state;
    const previous = before.session;
    const wasKnown = before.status === "signed-in" || before.status === "signed-out";
    const next = session === null ? null : share(previous, session);
    let endReason = before.endReason;
    if (next !== null) endReason = null;
    else if (previous !== null) endReason = now() >= Date.parse(previous.expiresAt) ? "expired" : "revoked";
    const clearsError = this.#errorSource === "check";
    if (clearsError) this.#errorSource = null;
    this.#set({
      status: next === null ? "signed-out" : "signed-in",
      session: next,
      error: clearsError ? null : before.error,
      endReason,
      pendingAction: before.pendingAction,
    });
    // An unchanged answer doesn't reschedule by itself; the expiry check must.
    if (reason === "expiry" && this.#expiryTimer === undefined) this.#scheduleExpiry();
    if (!wasKnown || next === previous) return;
    this.#emit("onSessionChange", next, previous);
    if (next === null && endReason !== null) this.#emit("onSignOut", endReason);
    if (reason !== "tab") this.#channel?.post({ type: "changed" });
  }

  #fail(error: QeetIDError, source: ErrorSource): void {
    this.#errorSource = source;
    const status = source === "check" && this.#state.status === "loading" ? "unavailable" : this.#state.status;
    this.#update({ status, error });
    this.#emit("onError", error);
  }

  #onTabMessage(message: TabMessage): void {
    if (message.type === "changed") {
      this.#check("tab");
      return;
    }
    // Another tab signed out: the cookie is gone, so there is nothing to ask.
    const previous = this.#state.session;
    this.#invalidateChecks();
    this.#set({
      status: "signed-out",
      session: null,
      error: this.#state.error,
      endReason: previous === null ? this.#state.endReason : "signed-out",
      pendingAction: null,
    });
    if (previous !== null) {
      this.#emit("onSessionChange", null, previous);
      this.#emit("onSignOut", "signed-out");
    }
  }

  #readAuthError(): void {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(AUTH_ERROR_PARAMETER);
    if (raw === null) return;
    url.searchParams.delete(AUTH_ERROR_PARAMETER);
    try {
      // Keep the router's history state; only the address bar changes.
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // A sandboxed frame may refuse; the error is still reported.
    }
    const code = /^[a-z][a-z0-9_]{0,63}$/.test(raw) ? raw : "server_error";
    this.#fail(new QeetIDError(`Signing in didn't complete (${code}).`, { code }), "sign-in");
  }

  /** Makes checks already on their way unable to land: an action's answer is newer. */
  #invalidateChecks(): void {
    this.#generation += 1;
    this.#inflight = null;
  }

  #update(patch: Partial<SessionState>): void {
    this.#set({ ...this.#state, ...patch });
  }

  #set(next: SessionState): void {
    const before = this.#state;
    if (
      before.status === next.status &&
      before.session === next.session &&
      before.error === next.error &&
      before.endReason === next.endReason &&
      before.pendingAction === next.pendingAction
    ) {
      return;
    }
    this.#state = Object.freeze(next);
    if (before.session !== next.session) this.#scheduleExpiry();
    for (const listener of [...this.#listeners]) listener();
  }

  #scheduleExpiry(): void {
    this.#clearExpiry();
    const session = this.#state.session;
    if (this.#starts === 0 || session === null) return;
    const due = Math.max(Date.parse(session.expiresAt) + EXPIRY_GRACE_MS, this.#lastExpiryCheckAt + EXPIRY_RECHECK_MS);
    const delay = Math.min(Math.max(due - now(), 0), MAX_TIMER_MS);
    this.#expiryTimer = setTimeout(() => {
      this.#expiryTimer = undefined;
      this.#lastExpiryCheckAt = now();
      this.#check("expiry");
    }, delay);
  }

  #clearExpiry(): void {
    if (this.#expiryTimer !== undefined) clearTimeout(this.#expiryTimer);
    this.#expiryTimer = undefined;
  }

  #emit<K extends keyof SessionEvents>(name: K, ...args: Parameters<NonNullable<SessionEvents[K]>>): void {
    const callback = this.#options.events()[name] as ((...values: unknown[]) => void) | undefined;
    if (callback === undefined) return;
    try {
      callback(...args);
    } catch (error) {
      // An app's callback must not break the session; report it like an uncaught error.
      if (typeof reportError === "function") reportError(error);
      else console.error(error);
    }
  }
}

/** The state for a page rendered with `initialSession`. */
export function stateFor(initialSession: Session | null | undefined): SessionState {
  return Object.freeze({
    status: initialSession === undefined ? "loading" : initialSession === null ? "signed-out" : "signed-in",
    session: initialSession ?? null,
    error: null,
    endReason: null,
    pendingAction: null,
  });
}

/**
 * `next`, reusing `previous` and each of its parts that say the same, so an
 * unchanged answer keeps the old objects and a component reading one part
 * re-renders only when that part changed.
 */
export function share(previous: Session | null, next: Session): Session {
  if (previous === null || previous === next) return next;
  const user = same(previous.user, next.user) ? previous.user : next.user;
  const organization = same(previous.organization, next.organization) ? previous.organization : next.organization;
  const roles = same(previous.roles, next.roles) ? previous.roles : next.roles;
  const permissions = same(previous.permissions, next.permissions) ? previous.permissions : next.permissions;
  if (
    user === previous.user &&
    organization === previous.organization &&
    roles === previous.roles &&
    permissions === previous.permissions &&
    previous.expiresAt === next.expiresAt
  ) {
    return previous;
  }
  return Object.freeze({ user, organization, roles, permissions, expiresAt: next.expiresAt });
}

function same(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

function asQeetIDError(cause: unknown, message: string): QeetIDError {
  return cause instanceof QeetIDError ? cause : new QeetIDError(message, { code: "network_error", cause });
}

function now(): number {
  return Date.now();
}

function ignore(): void {}
