"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

import { useAppearance } from "../client/context.js";
import { applyAppearance } from "./utils.js";
import type { Appearance } from "../types/common.js";

export interface CreateOrganizationProps {
  /**
   * Creates the organization with the entered name; throw to show the error
   * in the form. Your server does this: `POST /v1/tenants` (a `slug` and the
   * `name`) with the signed-in user's access token, who becomes its owner.
   * The browser can't: the hosted-login cookie doesn't reach that route,
   * because it answers with a token pair.
   */
  onCreate: (name: string) => Promise<void> | void;
  /** Called with the name once `onCreate` has finished. */
  onSuccess?: (name: string) => void;
  appearance?: Appearance;
}

/**
 * <CreateOrganization/> renders a form that collects a new organization's
 * name and hands it to `onCreate`, showing progress and any error.
 *
 *   <CreateOrganization onCreate={createOrganization} onSuccess={() => router.refresh()} />
 */
export function CreateOrganization({ onCreate, onSuccess, appearance: localAppearance }: CreateOrganizationProps) {
  const providerAppearance = useAppearance();
  const appearance = { ...providerAppearance, ...localAppearance };
  const vars = applyAppearance(appearance);
  const el = appearance.elements ?? {};

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    try {
      await onCreate(trimmed);
      setName("");
      onSuccess?.(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={el.card} style={{ ...vars, maxWidth: 400, margin: "0 auto" }}>
      <h2 className={el.headerTitle} style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
        Create organization
      </h2>
      {error && (
        <p className={el.errorMessage} style={{ color: "var(--qeetid-color-danger, #ef4444)", fontSize: 13, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label className={el.formLabel} style={labelStyle} htmlFor="qeetid-org-name">
            Organization name
          </label>
          <input
            id="qeetid-org-name"
            className={el.formInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <button type="submit" disabled={isLoading} className={el.buttonPrimary ?? el.button} style={primaryButtonStyle}>
          {isLoading ? "Creating…" : "Create organization"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--qeetid-color-border, #d1d5db)",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
  background: "transparent",
  color: "inherit",
};
const labelStyle: CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 };
const primaryButtonStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 16px",
  background: "var(--qeetid-color-primary, #F26D0E)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};
