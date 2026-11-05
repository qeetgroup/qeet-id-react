"use client";

import type { ReactElement } from "react";
import type { SignOutOptions } from "../core/store";
import { useStoreState } from "../hooks/useStoreState";
import { useQeetIDContext } from "../provider/context";
import { Trigger, type TriggerButtonProps } from "./internal/Trigger";

/** Props of `<SignOutButton>`: a `<button>`'s, and where to end up. */
export interface SignOutButtonProps extends TriggerButtonProps, SignOutOptions {}

/**
 * A button that signs out: it ends the session on the app's server, signs the
 * other tabs out and follows the server to Qeet ID's sign-out. Renders a
 * `<button>` labelled "Sign out", or gives the click to the app's own button as
 * its single child. While the server answers it is `aria-busy` and ignores
 * more clicks; a failure is reported to the provider's `onError`.
 *
 * ```tsx
 * <SignOutButton returnTo="/goodbye" />
 * ```
 */
export function SignOutButton({ returnTo, ...props }: SignOutButtonProps): ReactElement {
  const { store, localization } = useQeetIDContext("<SignOutButton>");
  const busy = useStoreState(store, (state) => state.pendingAction === "sign-out");
  return (
    <Trigger
      {...props}
      component="SignOutButton"
      label={localization.signOut}
      busy={busy}
      onActivate={() => {
        if (!busy) store.signOut({ returnTo }).catch(ignore);
      }}
    />
  );
}

/** The failure is in the session's `error` and the provider's `onError`. */
function ignore(): void {}
