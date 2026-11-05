"use client";

import type { ReactElement } from "react";
import type { SignInOptions } from "../core/navigation";
import { useQeetIDContext } from "../provider/context";
import { Trigger, type TriggerButtonProps } from "./internal/Trigger";

/** Props of `<SignUpButton>`: a `<button>`'s, and where to come back to. */
export interface SignUpButtonProps extends TriggerButtonProps, SignInOptions {}

/**
 * A button that starts signing up on Qeet ID's hosted pages and comes back to
 * `returnTo` (the current page by default). Renders a `<button>` labelled
 * "Sign up", or gives the click to the app's own button as its single child.
 *
 * ```tsx
 * <SignUpButton><Button variant="secondary">Create an account</Button></SignUpButton>
 * ```
 */
export function SignUpButton({ returnTo, organization, loginHint, ...props }: SignUpButtonProps): ReactElement {
  const { store, localization } = useQeetIDContext("<SignUpButton>");
  return (
    <Trigger
      {...props}
      component="SignUpButton"
      label={localization.signUp}
      onActivate={() => store.signUp({ returnTo, organization, loginHint })}
    />
  );
}
