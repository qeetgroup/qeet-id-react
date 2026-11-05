import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationSwitcher, QeetIDError, SignedIn, SignedOut, SignInButton, SignOutButton, UserButton, useSession } from "../src/index";
import { createTestSession, QeetIDTestProvider, type QeetIDTestProviderProps } from "../src/testing";
import { expectRenderToThrow } from "./helpers";

function wrapper(props: Omit<QeetIDTestProviderProps, "children">) {
  return ({ children }: { children: ReactNode }) => <QeetIDTestProvider {...props}>{children}</QeetIDTestProvider>;
}

describe("createTestSession", () => {
  it("is Meera at Brightleaf Foods by default, valid against the contract", () => {
    expect(createTestSession()).toEqual({
      user: {
        id: "0b9a2c7e-5d41-4f1e-9a3b-6c2d8e7f1a90",
        email: "meera@brightleaffoods.in",
        emailVerified: true,
        name: "Meera Iyer",
        picture: null,
      },
      organization: { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: "Brightleaf Foods" },
      roles: ["Finance approver"],
      permissions: ["invoice.approve", "invoice.read"],
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
  });

  it("changes any part", () => {
    const session = createTestSession({
      user: { name: null },
      organization: { name: "Acme Traders" },
      roles: [],
      permissions: ["invoice.read"],
    });
    expect(session.user).toMatchObject({ name: null, email: "meera@brightleaffoods.in" });
    expect(session.organization).toEqual({ id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: "Acme Traders" });
    expect(session).toMatchObject({ roles: [], permissions: ["invoice.read"] });
    expect(createTestSession({ organization: null }).organization).toBeNull();
  });
});

describe("QeetIDTestProvider", () => {
  it("renders signed out by default, and signed in with a session, without fetching", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const ui = (
      <>
        <SignedIn>in</SignedIn>
        <SignedOut>out</SignedOut>
      </>
    );
    const { container, unmount } = render(<QeetIDTestProvider>{ui}</QeetIDTestProvider>);
    expect(container).toHaveTextContent("out");
    unmount();
    render(<QeetIDTestProvider session={createTestSession()}>{ui}</QeetIDTestProvider>);
    expect(screen.getByText("in")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders a loading or unavailable session", async () => {
    const loading = renderHook(() => useSession(), { wrapper: wrapper({ status: "loading" }) });
    await act(async () => {});
    expect(loading.result.current.status).toBe("loading");
    const unavailable = renderHook(() => useSession(), { wrapper: wrapper({ status: "unavailable" }) });
    expect(unavailable.result.current).toMatchObject({ status: "unavailable", error: expect.any(QeetIDError) });
  });

  it("records navigations instead of moving the page", async () => {
    const onNavigate = vi.fn();
    render(
      <QeetIDTestProvider onNavigate={onNavigate} basePath="/account/auth">
        <SignInButton returnTo="/invoices" />
      </QeetIDTestProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onNavigate).toHaveBeenCalledWith("/account/auth/sign-in?returnTo=%2Finvoices");
  });

  it("signs out for real: state, callbacks and the redirect", async () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();
    render(
      <QeetIDTestProvider session={createTestSession()} onNavigate={onNavigate} onSignOut={onSignOut}>
        <SignedIn>
          <SignOutButton />
        </SignedIn>
        <SignedOut>Signed out</SignedOut>
      </QeetIDTestProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Signed out")).toBeInTheDocument();
    expect(onSignOut).toHaveBeenCalledWith("signed-out");
    expect(onNavigate).toHaveBeenCalledWith("/");
  });

  it("fails sign-out with signOutError", async () => {
    const onError = vi.fn();
    const refused = new QeetIDError("Refused.", { code: "csrf_rejected", status: 403 });
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapper({ session: createTestSession(), signOutError: refused, onError }),
    });
    await act(() => expect(result.current.signOut()).rejects.toBe(refused));
    expect(onError).toHaveBeenCalledWith(refused);
    expect(result.current.status).toBe("signed-in");
  });

  it("switches organisation by default, or as onSwitchOrganization answers", async () => {
    const { result } = renderHook(() => useSession(), { wrapper: wrapper({ session: createTestSession() }) });
    await act(() => result.current.switchOrganization("9a8b7c6d"));
    expect(result.current.session).toMatchObject({ organization: { id: "9a8b7c6d", name: null }, roles: [], permissions: [] });
    expect(result.current.session?.user.name).toBe("Meera Iyer");

    const answer = vi.fn(async (organizationId: string) =>
      createTestSession({ organization: { id: organizationId, name: "Acme Traders" } }),
    );
    render(
      <QeetIDTestProvider session={createTestSession()} onSwitchOrganization={answer}>
        <OrganizationSwitcher
          organizations={[
            { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: "Brightleaf Foods" },
            { id: "9a8b7c6d", name: "Acme Traders" },
          ]}
        />
      </QeetIDTestProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Brightleaf Foods/ }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Acme Traders/ }));
    expect(await screen.findByRole("button", { name: /Acme Traders/ })).toBeInTheDocument();
    expect(answer).toHaveBeenCalledWith("9a8b7c6d");
  });

  it("takes strings like the real provider", () => {
    render(
      <QeetIDTestProvider session={createTestSession()} localization={{ userButtonLabel: "Konto von {name}" }}>
        <UserButton />
      </QeetIDTestProvider>,
    );
    expect(screen.getByRole("button", { name: "Konto von Meera Iyer" })).toBeInTheDocument();
  });

  it("refuses a session that doesn't fit the contract", () => {
    expectRenderToThrow(() => render(<QeetIDTestProvider session={{ user: {} } as never} />), TypeError);
  });
});
