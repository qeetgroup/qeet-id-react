import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, type ButtonHTMLAttributes, createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "../src/contract";
import { assignLocation } from "../src/core/navigation";
import {
  Protect,
  QeetIDProvider,
  type QeetIDProviderProps,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "../src/index";
import { arjun, meera } from "./fixtures";
import { expectAccessible, expectRenderToThrow, mockSessionRoutes, pending, sessionAnswer } from "./helpers";

vi.mock("../src/core/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/core/navigation")>()),
  assignLocation: vi.fn(),
}));

function renderWith(ui: ReactNode, props: Omit<QeetIDProviderProps, "children"> = {}) {
  return render(
    <QeetIDProvider syncTabs={false} {...props}>
      {ui}
    </QeetIDProvider>,
  );
}

const gates = (
  <>
    <SignedIn>
      <p>Invoices due</p>
    </SignedIn>
    <SignedOut>
      <p>Sign in to see your invoices</p>
    </SignedOut>
  </>
);

describe("<SignedIn> and <SignedOut>", () => {
  it.each([
    ["signed in", meera, "Invoices due"],
    ["signed out", null, "Sign in to see your invoices"],
  ] as const)("render the right one on the first render when %s", (_label, initialSession, text) => {
    mockSessionRoutes();
    const { container } = renderWith(gates, { initialSession });
    expect(container).toHaveTextContent(text);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("render nothing while loading, then the right one", async () => {
    mockSessionRoutes({ session: [sessionAnswer(null)] });
    const { container } = renderWith(gates);
    expect(container).toBeEmptyDOMElement();
    expect(await screen.findByText("Sign in to see your invoices")).toBeInTheDocument();
  });

  it("render nothing when the server couldn't be reached", async () => {
    const routes = mockSessionRoutes({ session: [new TypeError("Failed to fetch")] });
    const { container } = renderWith(gates);
    await waitFor(() => expect(routes.calls).toHaveLength(1));
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });
});

describe("<Protect>", () => {
  const page = (props: Parameters<typeof Protect>[0] = {}) => (
    <Protect fallback={<p>Ask a finance approver</p>} loading={<p>Checking…</p>} {...props}>
      <p>Approval queue</p>
    </Protect>
  );

  it("renders its children to a signed-in person who holds the permission", () => {
    mockSessionRoutes();
    renderWith(page({ permission: "invoice.approve", role: "Finance approver" }), { initialSession: meera });
    expect(screen.getByText("Approval queue")).toBeInTheDocument();
  });

  it.each([
    ["a missing permission", { permission: "invoice.delete" }, meera],
    ["a missing role", { role: "Owner" }, meera],
    ["a failed condition", { condition: (session: Session) => session.user.emailVerified }, arjun],
    ["nobody signed in", {}, null],
  ] as const)("renders the fallback for %s", (_label, props, initialSession) => {
    mockSessionRoutes();
    renderWith(page(props), { initialSession });
    expect(screen.getByText("Ask a finance approver")).toBeInTheDocument();
    expect(screen.queryByText("Approval queue")).not.toBeInTheDocument();
  });

  it("passes a condition on the session", () => {
    mockSessionRoutes();
    renderWith(page({ condition: (session) => session.organization?.name === "Brightleaf Foods" }), { initialSession: meera });
    expect(screen.getByText("Approval queue")).toBeInTheDocument();
  });

  it("renders loading until the session is known", async () => {
    mockSessionRoutes({ session: [sessionAnswer(meera)] });
    renderWith(page());
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(await screen.findByText("Approval queue")).toBeInTheDocument();
  });

  it("renders nothing by default while loading or refused", () => {
    mockSessionRoutes({ session: [pending()] });
    const { container } = renderWith(
      <Protect permission="invoice.approve">
        <p>Approval queue</p>
      </Protect>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("starts signing in, back to this page, when nobody is signed in and redirectToSignIn is set", async () => {
    mockSessionRoutes();
    renderWith(page({ redirectToSignIn: true }), { initialSession: null });
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    await waitFor(() => expect(assignLocation).toHaveBeenCalledWith("/auth/sign-in?returnTo=%2Finvoices%3Fstatus%3Ddue"));
  });

  it("passes the sign-in options of redirectToSignIn", async () => {
    mockSessionRoutes();
    renderWith(page({ redirectToSignIn: { returnTo: "/approvals" } }), { initialSession: null });
    await waitFor(() => expect(assignLocation).toHaveBeenCalledWith("/auth/sign-in?returnTo=%2Fapprovals"));
  });

  it("never redirects a signed-in person who fails the check", async () => {
    mockSessionRoutes();
    renderWith(page({ permission: "invoice.delete", redirectToSignIn: true }), { initialSession: meera });
    expect(screen.getByText("Ask a finance approver")).toBeInTheDocument();
    await act(async () => {});
    expect(assignLocation).not.toHaveBeenCalled();
  });
});

const AppButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant: string }>(function AppButton(
  { variant, className, ...props },
  ref,
) {
  return <button ref={ref} type="button" className={`app-button app-button--${variant} ${className ?? ""}`.trim()} {...props} />;
});

describe("<SignInButton> and <SignUpButton>", () => {
  it("render a labelled button that starts signing in, back to the current page", async () => {
    mockSessionRoutes();
    renderWith(<SignInButton />, { initialSession: null });
    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(assignLocation).toHaveBeenCalledWith("/auth/sign-in?returnTo=%2Finvoices%3Fstatus%3Ddue");
  });

  it("take a label, button props and sign-in options", async () => {
    mockSessionRoutes();
    const onClick = vi.fn();
    renderWith(
      <SignUpButton className="cta" data-testid="cta" returnTo="/welcome" loginHint="meera@brightleaffoods.in" onClick={onClick}>
        Create an account
      </SignUpButton>,
      { initialSession: null },
    );
    const button = screen.getByRole("button", { name: "Create an account" });
    expect(button).toHaveClass("cta");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(assignLocation).toHaveBeenCalledWith("/auth/sign-up?returnTo=%2Fwelcome&loginHint=meera%40brightleaffoods.in");
  });

  it("give the click to the app's own button as the single child, keeping its ref, class and handler", async () => {
    mockSessionRoutes();
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    renderWith(
      <SignInButton className="header-cta" organization="5f0c1d2e">
        <AppButton ref={ref} variant="primary" onClick={onClick}>
          Sign in to Brightleaf
        </AppButton>
      </SignInButton>,
      { initialSession: null },
    );
    const button = screen.getByRole("button", { name: "Sign in to Brightleaf" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("app-button", "app-button--primary", "header-cta");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(assignLocation).toHaveBeenCalledWith("/auth/sign-in?returnTo=%2Finvoices%3Fstatus%3Ddue&organization=5f0c1d2e");
  });

  it("let the child's handler cancel the action", async () => {
    mockSessionRoutes();
    renderWith(
      <SignInButton>
        <AppButton variant="primary" onClick={(event) => event.preventDefault()}>
          Sign in
        </AppButton>
      </SignInButton>,
      { initialSession: null },
    );
    await userEvent.click(screen.getByRole("button"));
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it("let the button's own onClick cancel the action", async () => {
    mockSessionRoutes();
    renderWith(<SignInButton onClick={(event) => event.preventDefault()} />, { initialSession: null });
    await userEvent.click(screen.getByRole("button"));
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it("warn in development when the child isn't a button", () => {
    mockSessionRoutes();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWith(
      <SignUpButton>
        <span>Join</span>
      </SignUpButton>,
      { initialSession: null },
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("<SignUpButton> got a <span> as its child"));
  });

  it("render several children or a fragment inside a button", () => {
    mockSessionRoutes();
    renderWith(
      <SignInButton>
        <>
          <span aria-hidden="true">→</span> Sign in
        </>
      </SignInButton>,
      { initialSession: null },
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("use the provider's localised labels", () => {
    mockSessionRoutes();
    renderWith(
      <>
        <SignInButton />
        <SignUpButton />
        <SignOutButton />
      </>,
      { initialSession: null, localization: { signIn: "साइन इन करें", signUp: "खाता बनाएँ", signOut: "साइन आउट करें" } },
    );
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["साइन इन करें", "खाता बनाएँ", "साइन आउट करें"]);
  });

  it("are accessible", async () => {
    mockSessionRoutes();
    const { container } = renderWith(
      <>
        <SignInButton />
        <SignUpButton />
        <SignOutButton />
      </>,
      { initialSession: null },
    );
    await expectAccessible(container);
  });
});

describe("<SignOutButton>", () => {
  it("signs out and follows the server", async () => {
    const routes = mockSessionRoutes({ "sign-out": [{ body: { redirectTo: "/" } }] });
    renderWith(<SignOutButton returnTo="/goodbye" />, { initialSession: meera });
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(assignLocation).toHaveBeenCalledWith("/"));
    expect(routes.callsTo("sign-out")[0]?.body).toEqual({ returnTo: "/goodbye" });
  });

  it("is busy and ignores more clicks while the server answers", async () => {
    const routes = mockSessionRoutes({ "sign-out": [pending()] });
    renderWith(
      <SignOutButton>
        <AppButton variant="ghost">Leave</AppButton>
      </SignOutButton>,
      { initialSession: meera },
    );
    const button = screen.getByRole("button", { name: "Leave" });
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-pending");
    await userEvent.click(button);
    expect(routes.callsTo("sign-out")).toHaveLength(1);
  });

  it("reports a refusal to onError and stays signed in, without an unhandled rejection", async () => {
    mockSessionRoutes({ "sign-out": [{ status: 403, body: { error: { code: "csrf_rejected", message: "Refused." } } }] });
    const onError = vi.fn();
    renderWith(
      <>
        <SignOutButton />
        <SignedIn>
          <p>Still signed in</p>
        </SignedIn>
      </>,
      { initialSession: meera, onError },
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "csrf_rejected" })));
    expect(screen.getByText("Still signed in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).not.toHaveAttribute("aria-busy");
  });
});

describe("components outside the provider", () => {
  it("throw a clear error", () => {
    expectRenderToThrow(() => render(<SignInButton />), "<SignInButton> must be used inside <QeetIDProvider>.");
    expectRenderToThrow(() => render(<SignedIn>x</SignedIn>), "<SignedIn> must be used inside <QeetIDProvider>.");
  });
});
