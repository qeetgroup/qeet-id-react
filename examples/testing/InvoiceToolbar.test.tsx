// A customer's own test, with the testing entry: no server, any session.
import { Protect, SignOutButton } from "@qeet-id/react";
import { createTestSession, QeetIDTestProvider } from "@qeet-id/react/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { expect, it, vi } from "vitest";

function InvoiceToolbar(): ReactElement {
  return (
    <div role="toolbar" aria-label="Invoices">
      <Protect permission="invoice.approve">
        <button type="button">Approve</button>
      </Protect>
      <SignOutButton />
    </div>
  );
}

it("hides Approve from people who can't approve", () => {
  render(
    <QeetIDTestProvider session={createTestSession({ permissions: ["invoice.read"] })}>
      <InvoiceToolbar />
    </QeetIDTestProvider>,
  );
  expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
});

it("signs out and goes where the server says", async () => {
  const onNavigate = vi.fn();
  render(
    <QeetIDTestProvider session={createTestSession()} onNavigate={onNavigate}>
      <InvoiceToolbar />
    </QeetIDTestProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(onNavigate).toHaveBeenCalledWith("/");
});
