"use client";

import type { ReactNode } from "react";

import { useQeetIDState } from "../../client/context.js";

export interface RequireAuthProps {
  children: ReactNode;
  /** Rendered when the user is signed out. Default: nothing. */
  fallback?: ReactNode;
  /** Rendered while auth state is still loading. Default: nothing. */
  loading?: ReactNode;
}

/**
 * Gates rendering of `children` on sign-in state alone (`useQeetIDState().isAuthenticated`)
 * — no backend dependency, so it works in both redirect-only and embedded modes.
 *
 *   <RequireAuth fallback={<SignInButton />}>
 *     <Dashboard />
 *   </RequireAuth>
 */
export function RequireAuth({ children, fallback = null, loading = null }: RequireAuthProps) {
  const { isLoaded, isAuthenticated } = useQeetIDState();

  if (!isLoaded) return <>{loading}</>;
  return <>{isAuthenticated ? children : fallback}</>;
}
