"use client";

import type { ReactElement } from "react";
import type { SignInOptions } from "../core/navigation";
import { useQeetIDContext } from "../provider/context";
import { Trigger, type TriggerButtonProps } from "./internal/Trigger";

/** Props of `<SignInButton>`: a `<button>`'s, and where to sign in to and come back to. */
export interface SignInButtonProps extends TriggerButtonProps, SignInOptions {}

/**
 * A button that starts signing in on Qeet ID's hosted page and comes back to
 * `returnTo` (the current page by default). Renders a `<button>` labelled
 * "Sign in", or gives the click to the app's own button as its single child.
 *
 * ```tsx
 * <SignInButton />
 * <SignInButton returnTo="/invoices"><Button variant="primary">Review invoices</Button></SignInButton>
 * ```
 */
export function SignInButton({ returnTo, organization, loginHint, ...props }: SignInButtonProps): ReactElement {
  const { store, localization } = useQeetIDContext("<SignInButton>");
  return (
    <Trigger
      {...props}
      component="SignInButton"
      label={localization.signIn}
      onActivate={() => store.signIn({ returnTo, organization, loginHint })}
    />
  );
}
