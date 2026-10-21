"use client";

import { useId, useState, type CSSProperties } from "react";

import { useAppearance } from "../client/context.js";
import { useOrganization } from "../hooks/identity/useOrganization.js";
import { useOrganizationList } from "../hooks/identity/useOrganizationList.js";
import { applyAppearance } from "./utils.js";
import type { Appearance } from "../types/common.js";

export interface OrganizationSwitcherProps {
  /** Called after the active organization changes. */
  onOrganizationChange?: (organizationId: string) => void;
  appearance?: Appearance;
}

/**
 * <OrganizationSwitcher/> renders a dropdown that lets the user switch between
 * organizations (tenants) they belong to. Requires `apiUrl` on <QeetIDProvider>.
 *
 *   <OrganizationSwitcher onOrganizationChange={(id) => router.refresh()} />
 */
export function OrganizationSwitcher({ onOrganizationChange, appearance: localAppearance }: OrganizationSwitcherProps) {
  const providerAppearance = useAppearance();
  const appearance = { ...providerAppearance, ...localAppearance };
  const vars = applyAppearance(appearance);

  const { organization, setActive } = useOrganization();
  const { organizationList, isLoaded } = useOrganizationList();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();

  if (!isLoaded) return null;
  // The active organisation is known by id; its name comes from the list.
  const active = organizationList.find((o) => o.id === organization?.id) ?? organization;
  if (organizationList.length <= 1) {
    const only = active ?? organizationList[0];
    return <span style={{ ...vars, fontSize: 14, fontWeight: 500 }}>{only?.name ?? only?.id ?? "—"}</span>;
  }

  async function handleSelect(id: string) {
    setOpen(false);
    setError(null);
    try {
      await setActive(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch organization");
      return;
    }
    onOrganizationChange?.(id);
  }

  return (
    <div style={{ ...vars, position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={listId} style={triggerStyle}>
        {active?.name ?? active?.id ?? "Select organization"}
        <span aria-hidden style={{ marginLeft: 6 }}>
          ▾
        </span>
      </button>
      {error && (
        <p role="alert" style={{ color: "var(--qeetid-color-danger, #ef4444)", fontSize: 13, margin: "4px 0 0" }}>
          {error}
        </p>
      )}
      {open && (
        <>
          <div aria-hidden onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <ul id={listId} style={menuStyle}>
            {organizationList.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(org.id)}
                  aria-current={org.id === organization?.id ? "true" : undefined}
                  style={{ ...menuItemStyle, fontWeight: org.id === organization?.id ? 600 : 400 }}
                >
                  {org.name ?? org.id}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const triggerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  border: "1px solid var(--qeetid-color-border, #d1d5db)",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 14,
  color: "inherit",
};
const menuStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  zIndex: 50,
  minWidth: 180,
  background: "var(--qeetid-color-background, #fff)",
  color: "inherit",
  border: "1px solid var(--qeetid-color-border, #d1d5db)",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
  padding: 4,
  listStyle: "none",
  margin: 0,
};
const menuItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  border: "none",
  background: "transparent",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  color: "inherit",
};
