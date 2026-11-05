"use client";

import type { ReactNode } from "react";
import { useStoreState } from "../hooks/useStoreState";
import { useQeetIDContext } from "../provider/context";

/** Props of `<SignedOut>`. */
export interface SignedOutProps {
  children?: ReactNode;
}

/**
 * Renders its children only once the server has said nobody is signed in: not
 * while loading, and not when the first check failed (`unavailable`).
 *
 * ```tsx
 * <SignedOut><SignInButton /></SignedOut>
 * ```
 */
export function SignedOut({ children }: SignedOutProps): ReactNode {
  const { store } = useQeetIDContext("<SignedOut>");
  const signedOut = useStoreState(store, (state) => state.status === "signed-out");
  return signedOut ? children : null;
}
