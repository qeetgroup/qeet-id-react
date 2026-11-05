import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../src/contract";
import { OrganizationSwitcher, Protect, QeetIDProvider, SignedIn, SignedOut, SignInButton, UserButton } from "../src/index";
import { meera } from "./fixtures";
import { mockSessionRoutes, sessionAnswer } from "./helpers";

const page = (initialSession?: Session | null) => (
  <StrictMode>
    <QeetIDProvider initialSession={initialSession} syncTabs={false}>
      <SignedIn>
        <UserButton showName />
        <OrganizationSwitcher organizations={[{ id: "9a8b7c6d", name: "Acme Traders" }]} />
      </SignedIn>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <Protect permission="invoice.approve" loading={<p>Checking access…</p>}>
        <p>Approval queue</p>
      </Protect>
    </QeetIDProvider>
  </StrictMode>
);

let root: ReturnType<typeof hydrateRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

async function hydrate(initialSession?: Session | null) {
  const container = document.createElement("div");
  container.innerHTML = renderToString(page(initialSession));
  document.body.append(container);
  const serverHtml = container.innerHTML;
  const recoverable = vi.fn();
  const consoleError = vi.spyOn(console, "error");
  await act(async () => {
    root = hydrateRoot(container, page(initialSession), { onRecoverableError: recoverable });
  });
  return { container, serverHtml, recoverable, consoleError };
}

describe("hydration", () => {
  it.each([
    ["signed in", meera],
    ["signed out", null],
  ] as const)("matches the server's HTML when %s, with no request", async (_label, initialSession) => {
    const routes = mockSessionRoutes();
    const { container, serverHtml, recoverable, consoleError } = await hydrate(initialSession);
    expect(recoverable).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(serverHtml);
    expect(routes.calls).toHaveLength(0);
  });

  it("hydrates a page rendered without a session, then fills it in", async () => {
    const routes = mockSessionRoutes({ session: [sessionAnswer(meera)] });
    const { container, recoverable, consoleError } = await hydrate(undefined);
    expect(recoverable).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(container).toHaveTextContent("Approval queue"));
    expect(container).toHaveTextContent("Meera Iyer");
    expect(routes.callsTo("session")).toHaveLength(1);
  });
});
