"use client";

import { type ReactNode, useEffect } from "react";
import type { Session } from "../contract";
import { hasAccess } from "../core/access";
import type { SignInOptions } from "../core/navigation";
import { useStoreState } from "../hooks/useStoreState";
import { useQeetIDContext } from "../provider/context";

/** Props of `<Protect>`. */
export interface ProtectProps {
  children?: ReactNode;
  /** A role the person must hold in the session's organisation, by name. */
  role?: string;
  /** A permission the person must hold in the session's organisation, by key. */
  permission?: string;
  /** Any other check of the session; with `role` or `permission`, all must hold. */
  condition?: (session: Session) => boolean;
  /** Rendered when nobody is signed in or the check fails. Nothing by default. */
  fallback?: ReactNode;
  /** Rendered while the session isn't known yet (`loading` or `unavailable`). Nothing by default. */
  loading?: ReactNode;
  /**
   * When nobody is signed in, start signing in instead of rendering `fallback`,
   * coming back to this page (or to `returnTo`). A signed-in person who fails
   * the check still gets `fallback`, so this never loops.
   */
  redirectToSignIn?: boolean | SignInOptions;
}

/**
 * Renders its children only when someone is signed in and holds what it asks
 * for. A route guard for any router: put it around a page.
 *
 * It only decides what this page shows. The children's code still reaches the
 * browser, and the server must check every request it answers.
 *
 * ```tsx
 * <Protect permission="invoice.approve" fallback={<p>Ask a finance approver.</p>}>
 *   <ApprovalQueue />
 * </Protect>
 * ```
 */
export function Protect({
  children,
  role,
  permission,
  condition,
  fallback = null,
  loading = null,
  redirectToSignIn = false,
}: ProtectProps): ReactNode {
  const { store } = useQeetIDContext("<Protect>");
  const status = useStoreState(store, (state) => state.status);
  const session = useStoreState(store, (state) => state.session);
  const redirecting = status === "signed-out" && redirectToSignIn !== false;
  const signInOptions = typeof redirectToSignIn === "object" ? redirectToSignIn : undefined;
  const returnTo = signInOptions?.returnTo;
  const organization = signInOptions?.organization;
  const loginHint = signInOptions?.loginHint;

  useEffect(() => {
    if (redirecting) store.signIn({ returnTo, organization, loginHint });
  }, [redirecting, store, returnTo, organization, loginHint]);

  if (status === "loading" || status === "unavailable" || redirecting) return loading;
  if (session === null) return fallback;
  const allowed = hasAccess(session, { role, permission }) && (condition === undefined || condition(session));
  return allowed ? children : fallback;
}
