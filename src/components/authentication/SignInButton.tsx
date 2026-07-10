"use client";

import type { ReactNode } from "react";
import { usePaths } from "../../client/context.js";

// Sends the browser to a hosted auth URL, preserving where to come back to.
// (Kept local, not shared, so this module has no dependency on the rest of
// the SDK beyond `usePaths` — it stays drop-in and tree-shakeable on its own.)
function navigate(url: string, returnTo?: string): void {
  const u = new URL(url, window.location.origin);
  if (returnTo !== undefined) u.searchParams.set("return_to", returnTo);
  window.location.href = u.toString();
}

export interface SignInButtonProps {
  children?: ReactNode;
  className?: string;
  /** Path to return to after sign-in (defaults to the current location). */
  returnTo?: string;
}

/** Generic unstyled button that sends the browser to the hosted login. */
export function SignInButton({ children, className, returnTo }: SignInButtonProps) {
  const { loginUrl } = usePaths();
  return (
    <button type="button" className={className} onClick={() => navigate(loginUrl, returnTo ?? window.location.pathname + window.location.search)}>
      {children ?? "Sign in"}
    </button>
  );
}
