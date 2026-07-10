"use client";

import type { ReactNode } from "react";
import { usePaths } from "../../client/context.js";

function navigate(url: string, returnTo?: string): void {
  const u = new URL(url, window.location.origin);
  if (returnTo !== undefined) u.searchParams.set("return_to", returnTo);
  window.location.href = u.toString();
}

export interface SignUpButtonProps {
  children?: ReactNode;
  className?: string;
  /** Path to return to after sign-up (defaults to the current location). */
  returnTo?: string;
}

/** Generic unstyled button that sends the browser to the hosted sign-up. */
export function SignUpButton({ children, className, returnTo }: SignUpButtonProps) {
  const { signUpUrl } = usePaths();
  return (
    <button type="button" className={className} onClick={() => navigate(signUpUrl, returnTo ?? window.location.pathname + window.location.search)}>
      {children ?? "Sign up"}
    </button>
  );
}
