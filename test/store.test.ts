import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Session, sessionRoutes } from "../src/contract";
import { FOCUS_CHECK_INTERVAL_MS, type SessionEvents, SessionStore, type SessionStoreOptions, share, stateFor } from "../src/core/store";
import type { SessionTransport } from "../src/core/transport";
import { QeetIDError } from "../src/errors";
import { flush, pending } from "./helpers";
import { arjun, meera } from "./fixtures";

const routes = sessionRoutes();

function setup(overrides: Partial<SessionStoreOptions> = {}, transport: Partial<SessionTransport> = {}) {
  const events: Required<{ [K in keyof SessionEvents]: ReturnType<typeof vi.fn> }> = {
    onSessionChange: vi.fn(),
    onSignOut: vi.fn(),
    onError: vi.fn(),
  };
  const navigate = vi.fn();
  const getSession = vi.fn<SessionTransport["getSession"]>(transport.getSession ?? (async () => meera));
  const signOut = vi.fn<SessionTransport["signOut"]>(
    transport.signOut ?? (async () => ({ redirectTo: "https://id.qeet.in/v1/oauth/logout?client_id=brightleaf" })),
  );
  const switchOrganization = vi.fn<SessionTransport["switchOrganization"]>(transport.switchOrganization ?? (async () => meera));
  const store = new SessionStore({
    routes,
    transport: { getSession, signOut, switchOrganization },
    navigate,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    syncTabs: false,
    readAuthError: false,
    events: () => events as SessionEvents,
    ...overrides,
  });
  return { store, events, navigate, getSession, signOut, switchOrganization };
}

function focusTab(): void {
  window.dispatchEvent(new Event("focus"));
}

describe("SessionStore: loading", () => {
  it("has no side effects until started, then checks once", async () => {
    const { store, getSession } = setup();
    expect(store.getSnapshot()).toMatchObject({ status: "loading", session: null, error: null });
    expect(getSession).not.toHaveBeenCalled();
    const stop = store.start();
    await flush();
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-in", session: meera });
    stop();
  });

  it("makes one request when started, stopped and started again, as StrictMode does", async () => {
    const { store, getSession } = setup();
    const stop = store.start();
    stop();
    const stopAgain = store.start();
    await flush();
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().status).toBe("signed-in");
    stopAgain();
  });

  it("knows the session from initialSession without asking", async () => {
    const { store, getSession } = setup({ initialSession: meera });
    expect(store.getSnapshot()).toMatchObject({ status: "signed-in", session: meera });
    const stop = store.start();
    await flush();
    expect(getSession).not.toHaveBeenCalled();
    stop();
  });

  it("knows nobody is signed in from initialSession null", () => {
    const { store } = setup({ initialSession: null });
    expect(store.getSnapshot()).toMatchObject({ status: "signed-out", session: null });
    expect(store.getServerSnapshot()).toBe(store.getSnapshot());
  });

  it("is unavailable when the first check fails, and recovers on the next", async () => {
    const failure = new QeetIDError("GET /auth/session got no response.", { code: "network_error" });
    const { store, events, getSession } = setup({}, { getSession: vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(null) });
    const stop = store.start();
    await flush();
    expect(store.getSnapshot()).toMatchObject({ status: "unavailable", error: failure });
    expect(events.onError).toHaveBeenCalledWith(failure);
    window.dispatchEvent(new Event("online"));
    await flush();
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-out", error: null });
    expect(events.onSessionChange).not.toHaveBeenCalled();
    stop();
  });

  it("keeps the last known session when a later check fails", async () => {
    const failure = new QeetIDError("Qeet ID couldn't be reached.", { code: "session_unavailable", status: 503 });
    const { store } = setup({ initialSession: meera }, { getSession: vi.fn().mockRejectedValue(failure) });
    await expect(store.refresh()).rejects.toBe(failure);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-in", session: meera, error: failure });
  });

  it("wraps a failure that isn't a QeetIDError", async () => {
    const { store } = setup({ initialSession: null }, { getSession: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });
    const error = await store.refresh().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(QeetIDError);
    expect(error).toMatchObject({ code: "network_error", cause: new TypeError("Failed to fetch") });
  });
});

describe("SessionStore: checks", () => {
  it("shares a check already on its way", async () => {
    const { store, getSession } = setup({ initialSession: null });
    const first = store.refresh();
    const second = store.refresh();
    expect(second).toBe(first);
    await first;
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("checks when the tab regains focus, at most once in five seconds", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-05T10:00:00Z") });
    try {
      const { store, getSession } = setup({ initialSession: meera });
      const stop = store.start();
      focusTab();
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
      expect(getSession).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(FOCUS_CHECK_INTERVAL_MS);
      focusTab();
      await vi.advanceTimersByTimeAsync(0);
      expect(getSession).toHaveBeenCalledTimes(2);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("doesn't check on focus while the page is hidden, or when turned off", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const { store, getSession } = setup({ initialSession: meera });
    const stop = store.start();
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(getSession).not.toHaveBeenCalled();
    stop();
    visibility.mockRestore();

    const off = setup({ initialSession: meera, refetchOnWindowFocus: false, refetchOnReconnect: false });
    const stopOff = off.store.start();
    focusTab();
    window.dispatchEvent(new Event("online"));
    await flush();
    expect(off.getSession).not.toHaveBeenCalled();
    stopOff();
  });

  it("stops listening when stopped", async () => {
    const { store, getSession } = setup({ initialSession: meera });
    const stop = store.start();
    stop();
    stop();
    focusTab();
    window.dispatchEvent(new Event("online"));
    await flush();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("keeps the same objects when an answer says the same, so nothing re-renders", async () => {
    const { store } = setup({ initialSession: meera }, { getSession: async () => JSON.parse(JSON.stringify(meera)) });
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    await store.refresh();
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps each unchanged part of a changed session", async () => {
    const renamed: Session = { ...meera, user: { ...meera.user, name: "Meera K. Iyer" } };
    const { store, events } = setup({ initialSession: meera }, { getSession: async () => JSON.parse(JSON.stringify(renamed)) });
    await store.refresh();
    const { session } = store.getSnapshot();
    expect(session?.user.name).toBe("Meera K. Iyer");
    expect(session?.organization).toBe(meera.organization);
    expect(session?.roles).toBe(meera.roles);
    expect(events.onSessionChange).toHaveBeenCalledWith(session, meera);
    expect(events.onSignOut).not.toHaveBeenCalled();
  });

  it("drops an answer that an action made stale", async () => {
    let answer: (session: Session | null) => void = () => {};
    const { store } = setup(
      { initialSession: meera },
      {
        getSession: () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      },
    );
    const check = store.refresh();
    await store.switchOrganization("5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f");
    answer(null);
    await expect(check).resolves.toBeNull();
    expect(store.getSnapshot().status).toBe("signed-in");
  });
});

describe("SessionStore: expiry and revocation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-05T21:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks just after expiresAt and reports an expired session", async () => {
    const { store, events, getSession } = setup({ initialSession: meera }, { getSession: async () => null });
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    expect(getSession).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60 * 1000 + 1000);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-out", endReason: "expired" });
    expect(events.onSignOut).toHaveBeenCalledWith("expired");
    expect(events.onSessionChange).toHaveBeenCalledWith(null, meera);
    stop();
  });

  it("reschedules when the server renews the session", async () => {
    const renewed: Session = { ...meera, expiresAt: "2026-11-05T22:30:00.000Z" };
    const { store, getSession } = setup(
      { initialSession: meera },
      { getSession: vi.fn().mockResolvedValueOnce(renewed).mockResolvedValue(null) },
    );
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(31 * 60 * 1000);
    expect(store.getSnapshot().session?.expiresAt).toBe(renewed.expiresAt);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().endReason).toBe("expired");
    stop();
  });

  it("asks again a minute later, never in a loop, when this browser's clock is ahead of the server's", async () => {
    const past: Session = { ...meera, expiresAt: "2026-11-05T20:00:00.000Z" };
    const { store, getSession } = setup({ initialSession: past }, { getSession: async () => JSON.parse(JSON.stringify(past)) });
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(getSession).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(getSession).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().status).toBe("signed-in");
    stop();
  });

  it("asks again later when the expiry check fails", async () => {
    const { store, getSession } = setup(
      { initialSession: meera },
      { getSession: vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(null) },
    );
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(31 * 60 * 1000);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-in", error: expect.objectContaining({ code: "network_error" }) });
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-out", endReason: "expired", error: null });
    stop();
  });

  it("calls a session that ends before expiresAt revoked", async () => {
    const { store, events } = setup({ initialSession: meera }, { getSession: async () => null });
    await store.refresh();
    expect(store.getSnapshot()).toMatchObject({ status: "signed-out", endReason: "revoked" });
    expect(events.onSignOut).toHaveBeenCalledWith("revoked");
  });

  it("schedules nothing when stopped, and caps a far expiry at the longest timer", async () => {
    const far: Session = { ...meera, expiresAt: "2099-01-01T00:00:00.000Z" };
    const { store, getSession } = setup({ initialSession: far });
    expect(vi.getTimerCount()).toBe(0);
    const stop = store.start();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(2_147_483_646);
    expect(getSession).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(getSession).toHaveBeenCalledTimes(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("SessionStore: signing in and up", () => {
  it("sends the page to sign-in with the current page as the return path", () => {
    const { store, navigate } = setup({ initialSession: null });
    store.signIn();
    expect(navigate).toHaveBeenCalledWith("/auth/sign-in?returnTo=%2Finvoices%3Fstatus%3Ddue");
  });

  it("passes returnTo, organization and loginHint", () => {
    const { store, navigate } = setup({ initialSession: null });
    store.signUp({ returnTo: "/welcome", organization: "5f0c1d2e", loginHint: "meera@brightleaffoods.in" });
    expect(navigate).toHaveBeenCalledWith("/auth/sign-up?returnTo=%2Fwelcome&organization=5f0c1d2e&loginHint=meera%40brightleaffoods.in");
  });

  it("uses the current page instead of a return path on another site", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { store, navigate } = setup({ initialSession: null });
    store.signIn({ returnTo: "https://evil.example/" });
    expect(navigate).toHaveBeenCalledWith("/auth/sign-in?returnTo=%2Finvoices%3Fstatus%3Ddue");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("isn't a path on this site"));
  });
});

describe("SessionStore: signing out", () => {
  it("ends the session, reports it and follows the server", async () => {
    const { store, events, navigate, signOut } = setup({ initialSession: meera });
    const states: string[] = [];
    store.subscribe(() => states.push(`${store.getSnapshot().status}/${store.getSnapshot().pendingAction}`));
    await store.signOut({ returnTo: "/goodbye" });
    expect(signOut).toHaveBeenCalledWith({ returnTo: "/goodbye" });
    expect(states).toEqual(["signed-in/sign-out", "signed-out/null"]);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-out", session: null, endReason: "signed-out", error: null });
    expect(events.onSessionChange).toHaveBeenCalledWith(null, meera);
    expect(events.onSignOut).toHaveBeenCalledWith("signed-out");
    expect(navigate).toHaveBeenCalledWith("https://id.qeet.in/v1/oauth/logout?client_id=brightleaf");
  });

  it("sends no return path on another site", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { store, signOut } = setup({ initialSession: meera });
    await store.signOut({ returnTo: "//evil.example/" });
    expect(signOut).toHaveBeenCalledWith({});
  });

  it("shares a sign-out already on its way", async () => {
    const { store, signOut } = setup({ initialSession: meera });
    const first = store.signOut();
    expect(store.signOut()).toBe(first);
    await first;
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the server refuses", async () => {
    const refused = new QeetIDError("This request must come from the app's own pages.", { code: "csrf_rejected", status: 403 });
    const { store, events, navigate } = setup({ initialSession: meera }, { signOut: vi.fn().mockRejectedValue(refused) });
    await expect(store.signOut()).rejects.toBe(refused);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-in", session: meera, error: refused, pendingAction: null });
    expect(events.onError).toHaveBeenCalledWith(refused);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps an action's failure through a successful check, until an action succeeds", async () => {
    const refused = new QeetIDError("Refused.", { code: "csrf_rejected", status: 403 });
    const { store } = setup(
      { initialSession: meera },
      { signOut: vi.fn().mockRejectedValueOnce(refused).mockResolvedValue({ redirectTo: "/" }) },
    );
    await store.signOut().catch(() => {});
    await store.refresh();
    expect(store.getSnapshot().error).toBe(refused);
    await store.signOut();
    expect(store.getSnapshot().error).toBeNull();
  });
});

describe("SessionStore: switching organisation", () => {
  const acme: Session = {
    ...meera,
    organization: { id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", name: "Acme Traders" },
    roles: [],
    permissions: [],
  };

  it("takes the new session and reports the change", async () => {
    const { store, events, switchOrganization } = setup({ initialSession: meera }, { switchOrganization: async () => acme });
    const pendingStates: Array<string | null> = [];
    store.subscribe(() => pendingStates.push(store.getSnapshot().pendingAction));
    await expect(store.switchOrganization(acme.organization!.id)).resolves.toEqual(acme);
    expect(switchOrganization).toHaveBeenCalledWith({ organizationId: acme.organization!.id });
    expect(pendingStates).toEqual(["switch-organization", null]);
    expect(store.getSnapshot().session?.organization).toEqual(acme.organization);
    expect(store.getSnapshot().session?.user).toBe(meera.user);
    expect(events.onSessionChange).toHaveBeenCalledWith(store.getSnapshot().session, meera);
  });

  it("refuses an empty id", async () => {
    const { store } = setup({ initialSession: meera });
    await expect(store.switchOrganization("")).rejects.toThrow(TypeError);
  });

  it("reports a refusal and keeps the session", async () => {
    const unavailable = new QeetIDError("Qeet ID can't switch this application's organisation.", {
      code: "organization_switch_unavailable",
      status: 501,
    });
    const { store, events } = setup({ initialSession: meera }, { switchOrganization: vi.fn().mockRejectedValue(unavailable) });
    await expect(store.switchOrganization(acme.organization!.id)).rejects.toBe(unavailable);
    expect(store.getSnapshot()).toMatchObject({ session: meera, error: unavailable, pendingAction: null });
    expect(events.onError).toHaveBeenCalledWith(unavailable);
  });

  it("lets the last of overlapping switches decide", async () => {
    let answerFirst: (session: Session) => void = () => {};
    const transport = vi
      .fn<SessionTransport["switchOrganization"]>()
      .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)))
      .mockResolvedValueOnce(arjun);
    const { store } = setup({ initialSession: meera }, { switchOrganization: transport });
    const first = store.switchOrganization("first");
    await store.switchOrganization("second");
    answerFirst(acme);
    await first;
    expect(store.getSnapshot().session?.user.id).toBe(arjun.user.id);
    expect(store.getSnapshot().pendingAction).toBeNull();
  });
});

describe("SessionStore: other tabs", () => {
  it("signs out when another tab did, without asking the server", async () => {
    const { store, events, getSession } = setup({ initialSession: meera, syncTabs: true });
    const stop = store.start();
    const otherTab = new BroadcastChannel("qeet-id:/auth/session");
    otherTab.postMessage({ type: "signed-out" });
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe("signed-out"));
    expect(store.getSnapshot().endReason).toBe("signed-out");
    expect(events.onSignOut).toHaveBeenCalledWith("signed-out");
    expect(getSession).not.toHaveBeenCalled();
    otherTab.close();
    stop();
  });

  it("checks when another tab says the session changed, and ignores other messages", async () => {
    const { store, getSession } = setup({ initialSession: null, syncTabs: true });
    const stop = store.start();
    const otherTab = new BroadcastChannel("qeet-id:/auth/session");
    otherTab.postMessage({ type: "something-else" });
    otherTab.postMessage("signed-out");
    otherTab.postMessage({ type: "changed" });
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe("signed-in"));
    expect(getSession).toHaveBeenCalledTimes(1);
    otherTab.close();
    stop();
  });

  it("tells the other tabs about its sign-out and switches, without personal data", async () => {
    const { store } = setup({ initialSession: meera, syncTabs: true }, { switchOrganization: async () => arjun });
    const stop = store.start();
    const otherTab = new BroadcastChannel("qeet-id:/auth/session");
    const heard: unknown[] = [];
    otherTab.addEventListener("message", (event) => heard.push(event.data));
    await store.switchOrganization("5f0c1d2e");
    await store.signOut();
    await vi.waitFor(() => expect(heard).toEqual([{ type: "changed" }, { type: "signed-out" }]));
    otherTab.close();
    stop();
  });

  it("doesn't hear an app with another base path", async () => {
    const { store, getSession } = setup({ initialSession: null, syncTabs: true });
    const stop = store.start();
    const otherApp = new BroadcastChannel("qeet-id:/admin/auth/session");
    otherApp.postMessage({ type: "changed" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getSession).not.toHaveBeenCalled();
    otherApp.close();
    stop();
  });

  it("works where the browser has no BroadcastChannel", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const { store } = setup({ initialSession: meera, syncTabs: true });
    const stop = store.start();
    await store.signOut();
    expect(store.getSnapshot().status).toBe("signed-out");
    stop();
  });
});

describe("SessionStore: a failed sign-in at the callback", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/invoices?status=due");
  });

  it("reports authError and removes it from the address bar, keeping the router's state", async () => {
    window.history.replaceState({ key: "router-7" }, "", "/invoices?status=due&authError=access_denied#top");
    const { store, events } = setup({ initialSession: null, readAuthError: true });
    const stop = store.start();
    const error = store.getSnapshot().error;
    expect(error).toBeInstanceOf(QeetIDError);
    expect(error).toMatchObject({ code: "access_denied" });
    expect(events.onError).toHaveBeenCalledWith(error);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe("/invoices?status=due#top");
    expect(window.history.state).toEqual({ key: "router-7" });
    await store.refresh();
    expect(store.getSnapshot().error).toBe(error);
    stop();
  });

  it("reads it once, and replaces a code that isn't one", () => {
    window.history.replaceState(null, "", "/invoices?authError=%3Cscript%3E");
    const { store, events } = setup({ initialSession: null, readAuthError: true });
    store.start()();
    store.start()();
    expect(store.getSnapshot().error?.code).toBe("server_error");
    expect(events.onError).toHaveBeenCalledTimes(1);
  });
});

describe("SessionStore: callbacks", () => {
  it("reports an app callback's exception without breaking the session", async () => {
    const reported = vi.fn();
    vi.stubGlobal("reportError", reported);
    const { store, events } = setup({ initialSession: meera });
    events.onSessionChange.mockImplementation(() => {
      throw new Error("the app's analytics failed");
    });
    await store.signOut();
    expect(store.getSnapshot().status).toBe("signed-out");
    expect(reported).toHaveBeenCalledWith(new Error("the app's analytics failed"));
  });

  it("logs a callback's exception where reportError doesn't exist", async () => {
    vi.stubGlobal("reportError", undefined);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { store, events } = setup({ initialSession: meera });
    events.onSignOut.mockImplementation(() => {
      throw new Error("boom");
    });
    await store.signOut();
    expect(logged).toHaveBeenCalledWith(new Error("boom"));
  });

  it("takes a newer server render as a check's answer", () => {
    const { store, events } = setup({ initialSession: meera });
    store.hydrate(null);
    expect(store.getSnapshot()).toMatchObject({ status: "signed-out", endReason: "revoked" });
    expect(events.onSessionChange).toHaveBeenCalledWith(null, meera);
  });
});

describe("helpers", () => {
  it("stateFor derives the status from initialSession", () => {
    expect(stateFor(undefined).status).toBe("loading");
    expect(stateFor(null).status).toBe("signed-out");
    expect(stateFor(meera).status).toBe("signed-in");
    expect(Object.isFrozen(stateFor(meera))).toBe(true);
  });

  it("share keeps the previous session when nothing changed", () => {
    expect(share(null, meera)).toBe(meera);
    expect(share(meera, meera)).toBe(meera);
    expect(share(meera, JSON.parse(JSON.stringify(meera)))).toBe(meera);
    const moved = share(meera, { ...meera, expiresAt: "2026-11-06T09:00:00.000Z" });
    expect(moved).not.toBe(meera);
    expect(moved.user).toBe(meera.user);
  });

  it("a pending check never settles", () => {
    expect(pending()).toBeInstanceOf(Promise);
  });
});
