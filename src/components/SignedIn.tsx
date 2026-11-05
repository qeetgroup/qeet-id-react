"use client";

import type { ReactNode } from "react";
import { useStoreState } from "../hooks/useStoreState";
import { useQeetIDContext } from "../provider/context";

/** Props of `<SignedIn>`. */
export interface SignedInProps {
  children?: ReactNode;
}

/**
 * Renders its children only while someone is signed in: not while loading,
 * not when signed out. With `initialSession` it is right on the first render.
 *
 * ```tsx
 * <SignedIn><UserButton /></SignedIn>
 * ```
 */
export function SignedIn({ children }: SignedInProps): ReactNode {
  const { store } = useQeetIDContext("<SignedIn>");
  const signedIn = useStoreState(store, (state) => state.status === "signed-in");
  return signedIn ? children : null;
}
