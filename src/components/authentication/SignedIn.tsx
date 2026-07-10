"use client";

import type { ReactNode } from "react";
import { useQeetIDState } from "../../client/context.js";

/** Renders children only when the user is signed in. */
export function SignedIn({ children }: { children: ReactNode }) {
  return useQeetIDState().isAuthenticated ? <>{children}</> : null;
}

/** Renders children only when the user is signed out. */
export function SignedOut({ children }: { children: ReactNode }) {
  return useQeetIDState().isAuthenticated ? null : <>{children}</>;
}
