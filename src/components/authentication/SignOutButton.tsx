"use client";

import type { ReactNode } from "react";
import { usePaths } from "../../client/context.js";

function navigate(url: string): void {
  window.location.href = url;
}

export interface SignOutButtonProps {
  children?: ReactNode;
  className?: string;
}

/** Generic unstyled button that signs the user out. */
export function SignOutButton({ children, className }: SignOutButtonProps) {
  const { logoutUrl } = usePaths();
  return (
    <button type="button" className={className} onClick={() => navigate(logoutUrl)}>
      {children ?? "Sign out"}
    </button>
  );
}
