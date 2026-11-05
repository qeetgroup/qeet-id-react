// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OrganizationSwitcher, Protect, QeetIDProvider, SignedIn, SignedOut, SignInButton, UserButton } from "../src/index";
import { meera } from "./fixtures";

const page = (initialSession?: typeof meera | null) => (
  <QeetIDProvider initialSession={initialSession}>
    <SignedIn>
      <UserButton showName />
      <OrganizationSwitcher organizations={[{ id: "9a8b7c6d", name: "Acme Traders" }]} />
    </SignedIn>
    <SignedOut>
      <SignInButton />
    </SignedOut>
    <Protect permission="invoice.approve" loading={<p>Checking access…</p>} fallback={<p>No access</p>}>
      <p>Approval queue</p>
    </Protect>
  </QeetIDProvider>
);

describe("server rendering", () => {
  it("runs without a window", () => {
    expect(typeof window).toBe("undefined");
  });

  it("renders the signed-in page from initialSession, asking nothing", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const html = renderToString(page(meera));
    expect(html).toContain("Meera Iyer");
    expect(html).toContain("Brightleaf Foods");
    expect(html).toContain("Approval queue");
    expect(html).not.toContain("Sign in");
    expect(html).not.toContain("style=");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders the signed-out page from initialSession null", () => {
    const html = renderToString(page(null));
    expect(html).toContain("Sign in");
    expect(html).toContain("No access");
    expect(html).not.toContain("Meera");
  });

  it("renders neither while the session isn't known", () => {
    const html = renderToString(page());
    expect(html).not.toContain("Sign in");
    expect(html).not.toContain("Meera");
    expect(html).toContain("Checking access…");
  });
});
