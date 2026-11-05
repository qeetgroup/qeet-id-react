"use client";

import type { ReactElement } from "react";
import { warnOnce } from "../core/development";
import { isHttpOrPath } from "../core/navigation";
import { useStoreState } from "../hooks/useStoreState";
import { useQeetIDContext } from "../provider/context";
import { format } from "../provider/localization";
import { Avatar } from "./internal/Avatar";
import { partClasses, type StylingProps } from "./internal/classNames";
import { useMenuButton } from "./internal/useMenuButton";

/** The parts of `<UserButton>` that take a class. */
export type UserButtonPart =
  | "trigger"
  | "avatar"
  | "avatarImage"
  | "avatarInitials"
  | "name"
  | "popover"
  | "header"
  | "headerName"
  | "headerEmail"
  | "menu"
  | "item"
  | "separator";

/** An item of `<UserButton>`'s menu: a link, or an action. */
export type UserButtonMenuItem =
  | {
      /** The item's text. */
      label: string;
      /** A path or an http(s) URL to go to. */
      href: string;
    }
  | {
      /** The item's text. */
      label: string;
      /** Called when the item is chosen, after the menu closes. */
      onSelect: () => void;
    };

/** Props of `<UserButton>`. */
export interface UserButtonProps extends StylingProps<UserButtonPart> {
  /** Show the person's name beside the avatar. Default `false`. */
  showName?: boolean;
  /** Items to put above "Sign out", such as a link to the account page. */
  menuItems?: readonly UserButtonMenuItem[];
  /** A path on this site to end up on after signing out. */
  signOutReturnTo?: string;
}

/**
 * The signed-in person's avatar, opening a menu with their name and email,
 * the app's own items, and "Sign out". A WAI-ARIA menu button: it works with a
 * keyboard and a screen reader, and in right-to-left pages. Renders nothing
 * unless someone is signed in.
 *
 * Style it with `@qeet-id/react/styles.css`, or with `className` and
 * `classNames`.
 *
 * ```tsx
 * <UserButton showName menuItems={[{ label: "Your account", href: "/account" }]} />
 * ```
 */
export function UserButton({ showName = false, menuItems = [], signOutReturnTo, ...styling }: UserButtonProps): ReactElement | null {
  const { store, localization } = useQeetIDContext("<UserButton>");
  const user = useStoreState(store, (state) => (state.status === "signed-in" ? (state.session?.user ?? null) : null));
  const signingOut = useStoreState(store, (state) => state.pendingAction === "sign-out");
  const menu = useMenuButton();
  const cls = partClasses("qeet-id-user-button", styling);

  if (user === null) return null;
  const displayName = user.name ?? user.email ?? localization.userFallback;
  const items = menuItems.filter((item) => {
    if (!("href" in item) || isHttpOrPath(item.href)) return true;
    warnOnce(`<UserButton> dropped the menu item ${JSON.stringify(item.label)}: its href isn't a path or an http(s) URL.`);
    return false;
  });

  return (
    <div className={cls("root")} {...menu.rootProps}>
      <button className={cls("trigger")} {...menu.triggerProps} aria-label={format(localization.userButtonLabel, { name: displayName })}>
        <Avatar
          src={user.picture}
          name={user.name}
          fallback={user.email}
          className={cls("avatar")}
          imageClassName={cls("avatarImage")}
          initialsClassName={cls("avatarInitials")}
        />
        {showName ? <span className={cls("name")}>{displayName}</span> : null}
      </button>
      {menu.open ? (
        <div className={cls("popover")}>
          <div className={cls("header")}>
            <span className={cls("headerName")}>{displayName}</span>
            {user.name !== null && user.email !== null ? <span className={cls("headerEmail")}>{user.email}</span> : null}
          </div>
          <div className={cls("menu")} role="menu" {...menu.menuProps} aria-labelledby={menu.triggerProps.id}>
            {items.map((item) =>
              "href" in item ? (
                <a
                  key={`${item.label} ${item.href}`}
                  className={cls("item")}
                  role="menuitem"
                  tabIndex={-1}
                  href={item.href}
                  onClick={() => menu.close(false)}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  className={cls("item")}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    menu.close(true);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              ),
            )}
            {items.length > 0 ? <hr className={cls("separator")} /> : null}
            <button
              className={cls("item")}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={signingOut || undefined}
              onClick={() => {
                if (signingOut) return;
                menu.close(true);
                store.signOut({ returnTo: signOutReturnTo }).catch(ignore);
              }}
            >
              {localization.signOut}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The failure is in the session's `error` and the provider's `onError`. */
function ignore(): void {}
