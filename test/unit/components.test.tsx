import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QeetIDProvider } from "../../src/client/provider.js";
import { SignedIn, SignedOut } from "../../src/components/authentication/SignedIn.js";
import { RequireAuth } from "../../src/components/authorization/RequireAuth.js";
import { UserAvatar } from "../../src/components/identity/UserMenu.js";

function withProvider(children: React.ReactNode, initialState?: Parameters<typeof QeetIDProvider>[0]["initialState"]) {
  return render(<QeetIDProvider initialState={initialState}>{children}</QeetIDProvider>);
}

describe("SignedIn / SignedOut", () => {
  it("renders SignedIn's children and not SignedOut's when authenticated", () => {
    withProvider(
      <>
        <SignedIn>
          <span data-testid="in">visible-in</span>
        </SignedIn>
        <SignedOut>
          <span data-testid="out">visible-out</span>
        </SignedOut>
      </>,
      { isAuthenticated: true },
    );

    expect(screen.queryByTestId("in")).not.toBeNull();
    expect(screen.queryByTestId("out")).toBeNull();
  });

  it("renders SignedOut's children and not SignedIn's when signed out", () => {
    withProvider(
      <>
        <SignedIn>
          <span data-testid="in">visible-in</span>
        </SignedIn>
        <SignedOut>
          <span data-testid="out">visible-out</span>
        </SignedOut>
      </>,
    );

    expect(screen.queryByTestId("in")).toBeNull();
    expect(screen.queryByTestId("out")).not.toBeNull();
  });
});

describe("RequireAuth", () => {
  it("renders children when authenticated", () => {
    withProvider(
      <RequireAuth fallback={<span data-testid="fallback">nope</span>}>
        <span data-testid="protected">secret</span>
      </RequireAuth>,
      { isAuthenticated: true },
    );

    expect(screen.queryByTestId("protected")).not.toBeNull();
    expect(screen.queryByTestId("fallback")).toBeNull();
  });

  it("renders the fallback when signed out", () => {
    withProvider(
      <RequireAuth fallback={<span data-testid="fallback">nope</span>}>
        <span data-testid="protected">secret</span>
      </RequireAuth>,
    );

    expect(screen.queryByTestId("protected")).toBeNull();
    expect(screen.queryByTestId("fallback")).not.toBeNull();
  });
});

describe("UserAvatar", () => {
  it("renders the first initial of the display name when there's no image", () => {
    render(<UserAvatar user={{ displayName: "Ada Lovelace" }} />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("falls back to the 'Account' label's initial when there's no name or email", () => {
    render(<UserAvatar user={null} />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("falls back to '?' when the label is whitespace-only", () => {
    render(<UserAvatar user={{ displayName: "   " }} />);
    expect(screen.getByText("?")).toBeTruthy();
  });
});
