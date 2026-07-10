"use client";

import type { CSSProperties } from "react";

import { Spinner } from "./Spinner.js";

export interface LoadingProps {
  /** Text shown next to the spinner. Default "Loading…". */
  label?: string;
  className?: string;
}

const style: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 };

/**
 * A minimal placeholder for the brief window before a hook's `isLoaded`
 * becomes true.
 *
 *   if (!isLoaded) return <Loading />;
 */
export function Loading({ label = "Loading…", className }: LoadingProps) {
  return (
    <span className={className} style={style} role="status" aria-live="polite">
      <Spinner size={14} />
      {label}
    </span>
  );
}
