import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { memo, type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "../src/contract";
import { assignLocation } from "../src/core/navigation";
import { QeetIDProvider, type QeetIDProviderProps, useOrganization, useQeetID, useSession, useUser } from "../src/index";
import { arjun, meera } from "./fixtures";
import { expectRenderToThrow, mockSessionRoutes, pending, sessionAnswer } from "./helpers";

vi.mock("../src/core/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/core/navigation")>()),
  assignLocation: vi.fn(),
}));

function wrapper(props: Omit<QeetIDProviderProps, "children"> = {}) {
  return ({ children }: { children: ReactNode }) => (
    <QeetIDProvider syncTabs={false} {...props}>
      {children}
    </QeetIDProvider>
  );
}

describe("QeetIDProvider: loading the session", () => {
  it("is loading, then signed in, after one request", async () => {
    const routes = mockSessionRoutes({ session: [sessionAnswer(meera)] });
    const { result } = renderHook(() => useSession(), { wrapper: wrapper() });
    expect(result.current).toMatchObject({ status: "loading", isLoaded: false, isSignedIn: false, session: null, user: null });
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    expect(result.current).toMatchObject({
      isLoaded: true,
      isSignedIn: true,
      session: meera,
      user: meera.user,
      organization: meera.organization,
    });
    expect(routes.callsTo("session")).toHaveLength(1);
  });

  it("knows the session on the first render with initialSession, and asks nothing", () => {
    const routes = mockSessionRoutes();
    const { result } = renderHook(() => useSession(), { wrapper: wrapper({ initialSession: meera }) });
    expect(result.current).toMatchObject({ status: "signed-in", user: meera.user });
    expect(routes.calls).toHaveLength(0);
  });

  it("makes one request under StrictMode", async () => {
    const routes = mockSessionRoutes({ session: [sessionAnswer(null)] });
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <StrictMode>
          <QeetIDProvider syncTabs={false}>{children}</QeetIDProvider>
        </StrictMode>
      ),
    });
    await waitFor(() => expect(result.current.status).toBe("signed-out"));
    expect(routes.callsTo("session")).toHaveLength(1);
  });

  it("reads the routes under another base path", async () => {
    const routes = mockSessionRoutes({ session: [sessionAnswer(null)] });
    const { result } = renderHook(() => useQeetID(), { wrapper: wrapper({ basePath: "/account/auth" }) });
    await waitFor(() => expect(routes.calls).toHaveLength(1));
    expect(routes.calls[0]?.url).toBe("/account/auth/session");
    expect(result.current.routes.signIn).toBe("/account/auth/sign-in");
  });

  it("is unavailable when the server can't be reached, and recovers when the browser is back online", async () => {
    const routes = mockSessionRoutes({ session: [new TypeError("Failed to fetch"), sessionAnswer(meera)] });
    const { result } = renderHook(() => useSession(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.error?.code).toBe("network_error");
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    expect(result.current.error).toBeNull();
    expect(routes.callsTo("session")).toHaveLength(2);
  });

  it("catches up when the tab regains focus", async () => {
    mockSessionRoutes({ session: [sessionAnswer(null)] });
    const { result } = renderHook(() => useSession(), { wrapper: wrapper({ initialSession: meera }) });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(result.current.status).toBe("signed-out"));
    expect(result.current.endReason).toBe("revoked");
  });

  it("takes a newer server render without asking", async () => {
    const routes = mockSessionRoutes();
    const onSessionChange = vi.fn();
    let currentSession: Session | null = null;
    const { result, rerender } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <QeetIDProvider syncTabs={false} initialSession={currentSession} onSessionChange={onSessionChange}>
          {children}
        </QeetIDProvider>
      ),
    });
    expect(result.current.status).toBe("signed-out");
    currentSession = meera;
    rerender();
    await waitFor(() => expect(result.current.user).toEqual(meera.user));
    expect(onSessionChange).toHaveBeenCalledWith(meera, null);
    expect(routes.calls).toHaveLength(0);
  });

  it("refuses an initialSession that isn't a session", () => {
    expectRenderToThrow(
      () => render(<QeetIDProvider initialSession={{ user: {} } as Session}>x</QeetIDProvider>),
      "<QeetIDProvider initialSession> isn't a session: session.user.id must be a non-empty string.",
    );
  });

  it("warns when basePath changes after it mounted, and keeps the first", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockSessionRoutes();
    let routes = "";
    function Routes() {
      routes = useQeetID().routes.session;
      return null;
    }
    const { rerender } = render(
      <QeetIDProvider syncTabs={false} initialSession={null} basePath="/auth">
        <Routes />
      </QeetIDProvider>,
    );
    rerender(
      <QeetIDProvider syncTabs={false} initialSession={null} basePath="/elsewhere">
        <Routes />
      </QeetIDProvider>,
    );
    expect(routes).toBe("/auth/session");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("basePath changed after <QeetIDProvider> mounted"));
  });
});

describe("hooks", () => {
  it("throw a clear error outside the provider", () => {
    for (const [hook, name] of [
      [useSession, "useSession"],
      [useUser, "useUser"],
      [useOrganization, "useOrganization"],
      [useQeetID, "useQeetID"],
    ] as const) {
      expectRenderToThrow(() => renderHook(() => hook()), `${name} must be used inside <QeetIDProvider>.`);
    }
  });

  it("useUser and useOrganization answer from the session", () => {
    mockSessionRoutes();
    const user = renderHook(() => useUser(), { wrapper: wrapper({ initialSession: meera }) });
    expect(user.result.current).toEqual({ isLoaded: true, user: meera.user });
    const organization = renderHook(() => useOrganization(), { wrapper: wrapper({ initialSession: meera }) });
    expect(organization.result.current).toMatchObject({
      isLoaded: true,
      organization: meera.organization,
      roles: ["Finance approver"],
      permissions: ["invoice.approve", "invoice.read"],
      isSwitching: false,
    });
    expect(organization.result.current.has({ permission: "invoice.approve" })).toBe(true);
    expect(organization.result.current.has({ role: "Finance approver", permission: "invoice.delete" })).toBe(false);
  });

  it("has() is a display hint on the session's roles and permissions, false when signed out", () => {
    mockSessionRoutes();
    const signedIn = renderHook(() => useSession(), { wrapper: wrapper({ initialSession: meera }) });
    expect(signedIn.result.current.has({})).toBe(true);
    expect(signedIn.result.current.has({ role: "Finance approver" })).toBe(true);
    expect(signedIn.result.current.has({ role: "Owner" })).toBe(false);
    const signedOut = renderHook(() => useSession(), { wrapper: wrapper({ initialSession: null }) });
    expect(signedOut.result.current.has({})).toBe(false);
    const outsideAnyOrganization = renderHook(() => useOrganization(), {
      wrapper: wrapper({ initialSession: { ...meera, organization: null } }),
    });
    expect(outsideAnyOrganization.result.current.has({})).toBe(false);
  });

  it("useQeetID's actions keep their identity across session changes", async () => {
    mockSessionRoutes({ session: [sessionAnswer(arjun)] });
    const { result } = renderHook(() => ({ actions: useQeetID(), session: useSession() }), { wrapper: wrapper({ initialSession: meera }) });
    const first = result.current.actions;
    await act(() => result.current.session.refresh());
    expect(result.current.session.user).toEqual(arjun.user);
    expect(result.current.actions).toBe(first);
    expect(result.current.session.signIn).toBe(first.signIn);
  });
});

describe("re-renders", () => {
  it("re-render only the components whose part of the session changed", async () => {
    const counts = { user: 0, organization: 0, actions: 0 };
    const UserName = memo(function UserName() {
      counts.user += 1;
      return <span>{useUser().user?.name}</span>;
    });
    const OrganizationName = memo(function OrganizationName() {
      counts.organization += 1;
      return <span>{useOrganization().organization?.name}</span>;
    });
    const Actions = memo(function Actions() {
      counts.actions += 1;
      useQeetID();
      return null;
    });
    const promoted: Session = { ...meera, roles: ["Finance approver", "Owner"] };
    const renamed: Session = { ...promoted, user: { ...meera.user, name: "Meera K. Iyer" } };
    const routes = mockSessionRoutes({ session: [sessionAnswer(promoted)] });
    let refresh: () => Promise<unknown> = async () => {};
    function Refresher() {
      refresh = useQeetID().refresh;
      return null;
    }
    render(
      <QeetIDProvider syncTabs={false} initialSession={meera}>
        <UserName />
        <OrganizationName />
        <Actions />
        <Refresher />
      </QeetIDProvider>,
    );
    expect(counts).toEqual({ user: 1, organization: 1, actions: 1 });

    await act(() => refresh());
    expect(counts).toEqual({ user: 1, organization: 2, actions: 1 });

    routes.answer("session", sessionAnswer(renamed));
    await act(() => refresh());
    expect(counts).toEqual({ user: 2, organization: 2, actions: 1 });
    expect(screen.getByText("Meera K. Iyer")).toBeInTheDocument();

    await act(() => refresh());
    expect(counts).toEqual({ user: 2, organization: 2, actions: 1 });
  });

  it("an inline localization object doesn't re-render consumers when its strings are the same", () => {
    mockSessionRoutes();
    let renders = 0;
    const Consumer = memo(function Consumer() {
      renders += 1;
      useQeetID();
      return null;
    });
    const { rerender } = render(
      <QeetIDProvider syncTabs={false} initialSession={null} localization={{ signIn: "Log in" }}>
        <Consumer />
      </QeetIDProvider>,
    );
    rerender(
      <QeetIDProvider syncTabs={false} initialSession={null} localization={{ signIn: "Log in" }}>
        <Consumer />
      </QeetIDProvider>,
    );
    expect(renders).toBe(1);
  });
});

describe("actions and callbacks", () => {
  it("signIn and signUp send the page to the session routes", () => {
    mockSessionRoutes();
    const { result } = renderHook(() => useQeetID(), { wrapper: wrapper({ initialSession: null }) });
    result.current.signIn({ returnTo: "/invoices/INV-2041" });
    result.current.signUp();
    expect(vi.mocked(assignLocation).mock.calls).toEqual([
      ["/auth/sign-in?returnTo=%2Finvoices%2FINV-2041"],
      ["/auth/sign-up?returnTo=%2Finvoices%3Fstatus%3Ddue"],
    ]);
  });

  it("signOut posts, reports and follows the server; the latest callbacks are called", async () => {
    const routes = mockSessionRoutes({ "sign-out": [{ body: { redirectTo: "https://id.qeet.in/v1/oauth/logout?client_id=brightleaf" } }] });
    const stale = vi.fn();
    const onSignOut = vi.fn();
    const onSessionChange = vi.fn();
    let callback = stale;
    const { result, rerender } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <QeetIDProvider syncTabs={false} initialSession={meera} onSignOut={callback} onSessionChange={onSessionChange}>
          {children}
        </QeetIDProvider>
      ),
    });
    callback = onSignOut;
    rerender();
    await act(() => result.current.signOut({ returnTo: "/goodbye" }));
    expect(routes.callsTo("sign-out")[0]?.body).toEqual({ returnTo: "/goodbye" });
    expect(result.current).toMatchObject({ status: "signed-out", endReason: "signed-out", pendingAction: null });
    expect(onSignOut).toHaveBeenCalledWith("signed-out");
    expect(stale).not.toHaveBeenCalled();
    expect(onSessionChange).toHaveBeenCalledWith(null, meera);
    expect(assignLocation).toHaveBeenCalledWith("https://id.qeet.in/v1/oauth/logout?client_id=brightleaf");
  });

  it("shows sign-out as pending while the server answers", async () => {
    mockSessionRoutes({ "sign-out": [pending()] });
    const { result } = renderHook(() => useSession(), { wrapper: wrapper({ initialSession: meera }) });
    act(() => {
      result.current.signOut().catch(() => {});
    });
    expect(result.current.pendingAction).toBe("sign-out");
  });

  it("onError hears a failed check", async () => {
    mockSessionRoutes({ session: [{ status: 503, body: { error: { code: "session_unavailable", message: "Qeet ID didn't answer." } } }] });
    const onError = vi.fn();
    renderHook(() => useSession(), { wrapper: wrapper({ onError }) });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "session_unavailable", status: 503 })));
  });
});
