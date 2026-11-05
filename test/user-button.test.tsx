import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { initialsOf } from "../src/components/internal/Avatar";
import type { Session } from "../src/contract";
import { assignLocation } from "../src/core/navigation";
import { QeetIDProvider, type QeetIDProviderProps, UserButton } from "../src/index";
import { arjun, meera } from "./fixtures";
import { expectAccessible, mockSessionRoutes, pending } from "./helpers";

vi.mock("../src/core/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/core/navigation")>()),
  assignLocation: vi.fn(),
}));

function renderWith(ui: ReactNode, props: Omit<QeetIDProviderProps, "children"> = {}) {
  mockSessionRoutes({ "sign-out": [{ body: { redirectTo: "https://id.qeet.in/v1/oauth/logout" } }] });
  return render(
    <QeetIDProvider syncTabs={false} initialSession={meera} {...props}>
      {ui}
    </QeetIDProvider>,
  );
}

const trigger = () => screen.getByRole("button", { name: "Account menu for Meera Iyer" });
const items = () => screen.getAllByRole("menuitem");

describe("<UserButton>: rendering", () => {
  it("renders nothing unless someone is signed in", () => {
    const { container } = renderWith(<UserButton />, { initialSession: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("is a closed menu button named after the person", () => {
    renderWith(<UserButton />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows the name beside the avatar when asked", () => {
    renderWith(<UserButton showName />);
    expect(trigger()).toHaveTextContent("Meera Iyer");
  });

  it("opens on click: header, the app's items, a separator and Sign out", async () => {
    const onSelect = vi.fn();
    renderWith(
      <UserButton
        menuItems={[
          { label: "Your account", href: "/account" },
          { label: "Keyboard shortcuts", onSelect },
        ]}
      />,
    );
    await userEvent.click(trigger());
    const menu = screen.getByRole("menu", { name: "Account menu for Meera Iyer" });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", menu.id);
    expect(screen.getByText("meera@brightleaffoods.in")).toBeInTheDocument();
    expect(items().map((item) => item.textContent)).toEqual(["Your account", "Keyboard shortcuts", "Sign out"]);
    expect(items()[0]).toHaveAttribute("href", "/account");
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(items()[0]).toHaveFocus();
    await expectAccessible(document.body);
  });

  it("drops an item whose href could run script", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWith(<UserButton menuItems={[{ label: "Danger", href: "javascript:alert(1)" }]} />);
    await userEvent.click(trigger());
    expect(items().map((item) => item.textContent)).toEqual(["Sign out"]);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dropped the menu item "Danger"'));
  });

  it("is accessible closed", async () => {
    const { container } = renderWith(<UserButton showName />);
    await expectAccessible(container);
  });
});

describe("<UserButton>: keyboard (WAI-ARIA APG menu button)", () => {
  const menuItems = [
    { label: "Your account", href: "/account" },
    { label: "Billing", href: "/billing" },
  ];

  it("Enter and Space open it on the first item; Escape closes it and returns focus", async () => {
    renderWith(<UserButton menuItems={menuItems} />);
    trigger().focus();
    await userEvent.keyboard("{Enter}");
    expect(items()[0]).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(items()[0]).toHaveFocus();
  });

  it("Down Arrow opens on the first item, Up Arrow on the last", async () => {
    renderWith(<UserButton menuItems={menuItems} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[0]).toHaveFocus();
    await userEvent.keyboard("{Escape}{ArrowUp}");
    expect(items()[2]).toHaveFocus();
    expect(items()[2]).toHaveTextContent("Sign out");
  });

  it("arrows move and wrap, Home and End jump", async () => {
    renderWith(<UserButton menuItems={menuItems} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(items()[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(items()[2]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(items()[0]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(items()[2]).toHaveFocus();
  });

  it("a typed letter moves to the next item starting with it", async () => {
    renderWith(<UserButton menuItems={[...menuItems, { label: "Security", href: "/security" }]} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("s");
    expect(document.activeElement).toHaveTextContent("Security");
    await userEvent.keyboard("{Escape}{ArrowDown}");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await userEvent.keyboard("s");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await userEvent.keyboard("s");
    expect(document.activeElement).toHaveTextContent("Sign out");
    await userEvent.keyboard("q");
    expect(document.activeElement).toHaveTextContent("Sign out");
  });

  it("Tab closes it and moves on", async () => {
    renderWith(
      <>
        <UserButton menuItems={menuItems} />
        <a href="/help">Help</a>
      </>,
    );
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.tab();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Space activates a link item", async () => {
    renderWith(<UserButton menuItems={menuItems} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    const link = items()[0] as HTMLAnchorElement;
    const click = vi.fn((event: MouseEvent) => event.preventDefault());
    link.addEventListener("click", click);
    await userEvent.keyboard(" ");
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("a press outside closes it without taking focus back; a second click on the button closes it", async () => {
    renderWith(
      <>
        <UserButton />
        <p>Elsewhere</p>
      </>,
    );
    await userEvent.click(trigger());
    await userEvent.click(screen.getByText("Elsewhere"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await userEvent.click(trigger());
    await userEvent.click(trigger());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("focus moving to another element closes it; focus going nowhere doesn't", async () => {
    renderWith(
      <>
        <UserButton />
        <button type="button">Next</button>
      </>,
    );
    await userEvent.click(trigger());
    fireEvent.blur(items()[0] as HTMLElement, { relatedTarget: null });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.blur(items()[0] as HTMLElement, { relatedTarget: screen.getByRole("button", { name: "Next" }) });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("<UserButton>: actions", () => {
  it("an action item closes the menu, returns focus and runs", async () => {
    const onSelect = vi.fn();
    renderWith(<UserButton menuItems={[{ label: "Keyboard shortcuts", onSelect }]} />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: "Keyboard shortcuts" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("Sign out signs out and follows the server", async () => {
    renderWith(<UserButton signOutReturnTo="/goodbye" />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(assignLocation).toHaveBeenCalledWith("https://id.qeet.in/v1/oauth/logout"));
  });

  it("Sign out is disabled while a sign-out is on its way", async () => {
    mockSessionRoutes({ "sign-out": [pending()] });
    render(
      <QeetIDProvider syncTabs={false} initialSession={meera}>
        <UserButton />
      </QeetIDProvider>,
    );
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await userEvent.click(trigger());
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveAttribute("aria-disabled", "true");
  });
});

describe("<UserButton>: avatar", () => {
  it("shows the picture, decorative, without sending a referrer", () => {
    const { container } = renderWith(<UserButton />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.brightleaffoods.in/people/meera.png");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(image?.closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to initials when the picture fails", () => {
    const { container } = renderWith(<UserButton />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(trigger()).toHaveTextContent("MI");
  });

  it("falls back to initials when the picture failed before hydration", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const currentSrc = vi
      .spyOn(HTMLImageElement.prototype, "currentSrc", "get")
      .mockReturnValue("https://cdn.brightleaffoods.in/people/meera.png");
    renderWith(<UserButton />);
    expect(trigger()).toHaveTextContent("MI");
    complete.mockRestore();
    currentSrc.mockRestore();
  });

  it("uses the email's initial without a name, and the name 'Your account' without either", () => {
    renderWith(<UserButton />, { initialSession: arjun });
    expect(screen.getByRole("button", { name: "Account menu for arjun@brightleaffoods.in" })).toHaveTextContent("A");
  });

  it("shows a person icon with neither a name nor an email", () => {
    const anonymous: Session = { ...arjun, user: { ...arjun.user, email: null } };
    const { container } = renderWith(<UserButton />, { initialSession: anonymous });
    expect(screen.getByRole("button", { name: "Account menu for Your account" })).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("ignores a picture that isn't an http(s) URL", () => {
    const odd: Session = { ...meera, user: { ...meera.user, picture: "javascript:alert(1)" } };
    const { container } = renderWith(<UserButton />, { initialSession: odd });
    expect(container.querySelector("img")).toBeNull();
  });

  it.each([
    ["Meera Iyer", null, "MI"],
    ["  meera   k   iyer ", null, "MI"],
    ["Ñandú", null, "Ñ"],
    ["இளங்கோ அடிகள்", null, "இஅ"],
    [null, "arjun@brightleaffoods.in", "A"],
    ["", "", ""],
  ])("initialsOf(%j, %j) is %j", (name, fallback, expected) => {
    expect(initialsOf(name, fallback)).toBe(expected);
  });
});

describe("<UserButton>: strings and styling", () => {
  it("takes every string from the provider", async () => {
    renderWith(<UserButton />, { localization: { userButtonLabel: "{name} का खाता", signOut: "साइन आउट करें" } });
    await userEvent.click(screen.getByRole("button", { name: "Meera Iyer का खाता" }));
    expect(screen.getByRole("menuitem", { name: "साइन आउट करें" })).toBeInTheDocument();
  });

  it("has BEM classes, the app's className and classNames, and state attributes", async () => {
    const { container } = renderWith(
      <UserButton className="site-account" classNames={{ trigger: "site-account__button", menu: "site-menu" }} showName />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("qeet-id-user-button", "site-account");
    expect(root).toHaveAttribute("data-state", "closed");
    expect(trigger()).toHaveClass("qeet-id-user-button__trigger", "site-account__button");
    expect(container.querySelector(".qeet-id-user-button__avatar")).not.toBeNull();
    expect(container.querySelector(".qeet-id-user-button__avatar-image")).not.toBeNull();
    await userEvent.click(trigger());
    expect(root).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("menu")).toHaveClass("qeet-id-user-button__menu", "site-menu");
  });

  it("leaves out its own classes when unstyled", async () => {
    const { container } = renderWith(<UserButton unstyled className="mine" />);
    await userEvent.click(trigger());
    expect(container.firstElementChild).toHaveClass("mine");
    expect(container.innerHTML).not.toContain("qeet-id-");
  });

  it("never writes an inline style, so a strict CSP needs no exception", async () => {
    const { container } = renderWith(<UserButton showName menuItems={[{ label: "Your account", href: "/account" }]} />);
    await userEvent.click(trigger());
    expect(container.querySelector("[style]")).toBeNull();
    expect(document.querySelector("style")).toBeNull();
  });

  it("works in a right-to-left page", async () => {
    document.documentElement.dir = "rtl";
    try {
      renderWith(<UserButton />, { localization: { userButtonLabel: "حساب {name}" } });
      const button = screen.getByRole("button", { name: "حساب Meera Iyer" });
      button.focus();
      await userEvent.keyboard("{ArrowDown}");
      expect(items()[0]).toHaveFocus();
      await expectAccessible(document.body);
    } finally {
      document.documentElement.dir = "";
    }
  });
});
