"use client";

import { type ReactElement, useState } from "react";
import { type Session, type SessionOrganization, safeReturnTo } from "../contract";
import { warnOnce } from "../core/development";
import { useStoreState } from "../hooks/useStoreState";
import { useQeetIDContext } from "../provider/context";
import { format } from "../provider/localization";
import { Avatar } from "./internal/Avatar";
import { partClasses, type StylingProps } from "./internal/classNames";
import { CheckIcon, ChevronIcon } from "./internal/icons";
import { useMenuButton } from "./internal/useMenuButton";

/** The parts of `<OrganizationSwitcher>` that take a class. */
export type OrganizationSwitcherPart =
  | "current"
  | "trigger"
  | "avatar"
  | "avatarInitials"
  | "name"
  | "chevron"
  | "popover"
  | "menu"
  | "item"
  | "itemName"
  | "check"
  | "status";

/** Props of `<OrganizationSwitcher>`. */
export interface OrganizationSwitcherProps extends StylingProps<OrganizationSwitcherPart> {
  /**
   * The organisations to offer, the current one included or not. The app
   * supplies them: Qeet ID doesn't give applications the list of a person's
   * organisations yet. With one or none, the switcher shows the current
   * organisation without a menu.
   */
  organizations?: readonly SessionOrganization[];
  /**
   * A path on this site to load after a switch. Loading a page drops every
   * cache of the old organisation's data; without it the session changes in
   * place and `onSessionChange` fires.
   */
  afterSwitchUrl?: string;
  /** Called with the new session after a switch. */
  onSwitch?: (session: Session) => void;
}

/**
 * The session's organisation, opening a menu of the others to switch to. A
 * WAI-ARIA menu button whose items are `menuitemradio`s, the current one
 * checked. While a switch is on its way the button is `aria-busy` and a live
 * region says so; a failure is shown and announced. Renders nothing unless
 * someone is signed in to an organisation.
 *
 * ```tsx
 * <OrganizationSwitcher organizations={organizations} afterSwitchUrl="/dashboard" />
 * ```
 */
export function OrganizationSwitcher({
  organizations = [],
  afterSwitchUrl,
  onSwitch,
  ...styling
}: OrganizationSwitcherProps): ReactElement | null {
  const { store, localization } = useQeetIDContext("<OrganizationSwitcher>");
  const session = useStoreState(store, (state) => (state.status === "signed-in" ? (state.session?.organization ?? null) : null));
  const switching = useStoreState(store, (state) => state.pendingAction === "switch-organization");
  const [target, setTarget] = useState<SessionOrganization | null>(null);
  const [failed, setFailed] = useState(false);
  const menu = useMenuButton();
  const cls = partClasses("qeet-id-organization-switcher", styling);

  if (session === null) return null;
  // The session may not carry the name; the app's list may.
  const current: SessionOrganization =
    session.name !== null
      ? session
      : { id: session.id, name: organizations.find((organization) => organization.id === session.id)?.name ?? null };
  const nameOf = (organization: SessionOrganization): string => organization.name ?? localization.organizationFallback;
  const options = [current, ...organizations.filter((organization) => organization.id !== current.id)];
  const status =
    switching && target !== null
      ? format(localization.organizationSwitching, { organization: nameOf(target) })
      : failed
        ? localization.organizationSwitchFailed
        : "";

  const avatar = (organization: SessionOrganization): ReactElement => (
    <Avatar name={organization.name} className={cls("avatar")} initialsClassName={cls("avatarInitials")} />
  );

  if (options.length === 1) {
    return (
      <div className={cls("root")} data-state="static">
        <span className={cls("current")}>
          {avatar(current)}
          <span className={cls("name")}>{nameOf(current)}</span>
        </span>
      </div>
    );
  }

  const choose = (organization: SessionOrganization): void => {
    menu.close(true);
    if (organization.id === current.id || switching) return;
    setTarget(organization);
    setFailed(false);
    store.switchOrganization(organization.id).then(
      (session) => {
        onSwitch?.(session);
        if (afterSwitchUrl === undefined) return;
        const path = safeReturnTo(afterSwitchUrl, window.location.origin);
        if (path === undefined)
          warnOnce(`<OrganizationSwitcher afterSwitchUrl> ${JSON.stringify(afterSwitchUrl)} isn't a path on this site.`);
        else store.navigate(path);
      },
      () => setFailed(true),
    );
  };

  return (
    <div className={cls("root")} {...menu.rootProps}>
      <button
        className={cls("trigger")}
        {...menu.triggerProps}
        aria-busy={switching || undefined}
        data-pending={switching ? "" : undefined}
      >
        {avatar(current)}
        <span className={cls("name")}>{nameOf(current)}</span>
        <ChevronIcon className={cls("chevron")} />
      </button>
      <span className={cls("status")} role="status">
        {status}
      </span>
      {menu.open ? (
        <div className={cls("popover")}>
          <div className={cls("menu")} role="menu" {...menu.menuProps} aria-label={localization.organizationSwitcherLabel}>
            {options.map((organization) => {
              const chosen = organization.id === current.id;
              return (
                <button
                  key={organization.id}
                  className={cls("item")}
                  type="button"
                  role="menuitemradio"
                  aria-checked={chosen}
                  tabIndex={-1}
                  onClick={() => choose(organization)}
                >
                  {avatar(organization)}
                  <span className={cls("itemName")}>{nameOf(organization)}</span>
                  {chosen ? <CheckIcon className={cls("check")} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
