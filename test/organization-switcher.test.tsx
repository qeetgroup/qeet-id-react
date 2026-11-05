import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Session, SessionOrganization } from "../src/contract";
import { assignLocation } from "../src/core/navigation";
import { OrganizationSwitcher, QeetIDProvider, type QeetIDProviderProps, useOrganization } from "../src/index";
import { meera } from "./fixtures";
import { type Answer, expectAccessible, mockSessionRoutes, pending } from "./helpers";

vi.mock("../src/core/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/core/navigation")>()),
  assignLocation: vi.fn(),
}));

const brightleaf: SessionOrganization = { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: "Brightleaf Foods" };
const acme: SessionOrganization = { id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", name: "Acme Traders" };
const sahyadri: SessionOrganization = { id: "1c2d3e4f-5a6b-4c7d-8e9f-a0b1c2d3e4f5", name: "Sahyadri Exports" };
const inAcme: Session = { ...meera, organization: acme, roles: ["Viewer"], permissions: ["invoice.read"] };

function renderWith(
  ui: ReactNode,
  props: Omit<QeetIDProviderProps, "children"> = {},
  switchAnswer: Answer = { body: { session: inAcme } },
) {
  const routes = mockSessionRoutes({ "switch-organization": [switchAnswer] });
  return {
    routes,
    ...render(
      <QeetIDProvider syncTabs={false} initialSession={meera} {...props}>
        {ui}
      </QeetIDProvider>,
    ),
  };
}

const trigger = () => screen.getByRole("button", { name: /Brightleaf Foods/ });

describe("<OrganizationSwitcher>: rendering", () => {
  it("renders nothing unless someone is signed in to an organisation", () => {
    const signedOut = renderWith(<OrganizationSwitcher organizations={[brightleaf, acme]} />, { initialSession: null });
    expect(signedOut.container).toBeEmptyDOMElement();
    signedOut.unmount();
    const noOrganization = renderWith(<OrganizationSwitcher organizations={[brightleaf, acme]} />, {
      initialSession: { ...meera, organization: null },
    });
    expect(noOrganization.container).toBeEmptyDOMElement();
  });

  it("shows the current organisation without a menu when there is nothing to switch to", async () => {
    const { container } = renderWith(<OrganizationSwitcher />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Brightleaf Foods");
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
    expect(container.querySelector(".qeet-id-organization-switcher__current")).not.toBeNull();
    await expectAccessible(container);
  });

  it("takes the current organisation's name from the list when the session has none", () => {
    renderWith(<OrganizationSwitcher organizations={[brightleaf]} />, {
      initialSession: { ...meera, organization: { id: brightleaf.id, name: null } },
    });
    expect(screen.getByText("Brightleaf Foods")).toBeInTheDocument();
  });

  it("names an organisation it knows no name for 'Organisation'", () => {
    renderWith(<OrganizationSwitcher />, { initialSession: { ...meera, organization: { id: brightleaf.id, name: null } } });
    expect(screen.getByText("Organisation")).toBeInTheDocument();
  });

  it("opens a menu of radio items, the current one checked and first", async () => {
    renderWith(<OrganizationSwitcher organizations={[acme, brightleaf, sahyadri]} />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    await userEvent.click(trigger());
    const menu = screen.getByRole("menu", { name: "Switch organisation" });
    expect(menu).toBeInTheDocument();
    const radios = screen.getAllByRole("menuitemradio");
    expect(radios.map((item) => [item.textContent, item.getAttribute("aria-checked")])).toEqual([
      ["BFBrightleaf Foods", "true"],
      ["ATAcme Traders", "false"],
      ["SESahyadri Exports", "false"],
    ]);
    expect(radios[0]).toHaveFocus();
    await expectAccessible(document.body);
  });
});

describe("<OrganizationSwitcher>: switching", () => {
  it("switches in place, announcing it, and reports the new session", async () => {
    const onSwitch = vi.fn();
    const { routes } = renderWith(
      <>
        <OrganizationSwitcher organizations={[brightleaf, acme]} onSwitch={onSwitch} />
        <Permissions />
      </>,
    );
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Acme Traders/ }));
    expect(routes.callsTo("switch-organization")[0]?.body).toEqual({ organizationId: acme.id });
    await waitFor(() => expect(screen.getByRole("button", { name: /Acme Traders/ })).toBeInTheDocument());
    expect(onSwitch).toHaveBeenCalledWith(inAcme);
    expect(screen.getByTestId("permissions")).toHaveTextContent("invoice.read");
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it("is busy and says where it is going while the server answers", async () => {
    renderWith(<OrganizationSwitcher organizations={[brightleaf, acme]} />, {}, pending());
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Acme Traders/ }));
    expect(trigger()).toHaveAttribute("aria-busy", "true");
    expect(trigger()).toHaveAttribute("data-pending");
    expect(screen.getByRole("status")).toHaveTextContent("Switching to Acme Traders…");
    expect(trigger()).toHaveFocus();
  });

  it("loads afterSwitchUrl after a switch, so no cache of the old organisation survives", async () => {
    renderWith(<OrganizationSwitcher organizations={[brightleaf, acme]} afterSwitchUrl="/dashboard" />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Acme Traders/ }));
    await waitFor(() => expect(assignLocation).toHaveBeenCalledWith("/dashboard"));
  });

  it("refuses an afterSwitchUrl on another site", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWith(<OrganizationSwitcher organizations={[brightleaf, acme]} afterSwitchUrl="https://evil.example/" />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Acme Traders/ }));
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("isn't a path on this site")));
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it("shows and announces a failed switch, keeping the organisation", async () => {
    const onError = vi.fn();
    renderWith(
      <OrganizationSwitcher organizations={[brightleaf, acme]} />,
      { onError },
      {
        status: 501,
        body: { error: { code: "organization_switch_unavailable", message: "Qeet ID can't switch this application's organisation." } },
      },
    );
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Acme Traders/ }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Couldn't switch organisation. Try again."));
    expect(trigger()).not.toHaveAttribute("aria-busy");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "organization_switch_unavailable", status: 501 }));
  });

  it("does nothing when the current organisation is chosen", async () => {
    const { routes } = renderWith(<OrganizationSwitcher organizations={[brightleaf, acme]} />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Brightleaf Foods/ }));
    expect(routes.calls).toHaveLength(0);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("works from the keyboard", async () => {
    renderWith(<OrganizationSwitcher organizations={[brightleaf, acme, sahyadri]} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitemradio", { name: /Sahyadri Exports/ })).toHaveFocus();
    await userEvent.keyboard("a");
    expect(screen.getByRole("menuitemradio", { name: /Acme Traders/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("button", { name: /Acme Traders/ })).toBeInTheDocument());
  });
});

describe("<OrganizationSwitcher>: strings and styling", () => {
  it("takes every string from the provider", async () => {
    renderWith(
      <OrganizationSwitcher organizations={[brightleaf, acme]} />,
      {
        localization: { organizationSwitcherLabel: "संगठन बदलें", organizationSwitching: "{organization} पर जा रहे हैं…" },
      },
      pending(),
    );
    await userEvent.click(trigger());
    expect(screen.getByRole("menu", { name: "संगठन बदलें" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Acme Traders/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Acme Traders पर जा रहे हैं…");
  });

  it("has BEM classes, classNames, and no inline styles; unstyled drops its classes", async () => {
    const { container, unmount } = renderWith(
      <OrganizationSwitcher
        organizations={[brightleaf, acme]}
        className="nav-organisations"
        classNames={{ item: "nav-organisations__item" }}
      />,
    );
    await userEvent.click(trigger());
    expect(container.firstElementChild).toHaveClass("qeet-id-organization-switcher", "nav-organisations");
    expect(screen.getAllByRole("menuitemradio")[0]).toHaveClass("qeet-id-organization-switcher__item", "nav-organisations__item");
    expect(container.querySelector(".qeet-id-organization-switcher__check")).not.toBeNull();
    expect(container.querySelector("[style]")).toBeNull();
    unmount();
    const plain = renderWith(<OrganizationSwitcher organizations={[brightleaf, acme]} unstyled />);
    expect(plain.container.innerHTML).not.toContain("qeet-id-");
  });
});

function Permissions() {
  return <p data-testid="permissions">{useOrganization().permissions.join(", ")}</p>;
}
