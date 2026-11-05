/**
 * `@qeet-id/react`: the provider, hooks and components for a React app whose
 * people sign in on Qeet ID's hosted pages and whose session lives on its own
 * server.
 *
 * ```tsx
 * import { QeetIDProvider, SignedIn, SignedOut, SignInButton, UserButton } from "@qeet-id/react";
 *
 * <QeetIDProvider initialSession={session}>
 *   <SignedOut><SignInButton /></SignedOut>
 *   <SignedIn><UserButton /></SignedIn>
 * </QeetIDProvider>
 * ```
 *
 * This module has no "use client": each component and hook module carries its
 * own, so `QeetIDError`, `VERSION` and the types stay importable from Server
 * Components. The session contract is `@qeet-id/react/contract`.
 *
 * @packageDocumentation
 */
export { QeetIDProvider } from "./provider/QeetIDProvider";
export type { QeetIDProviderProps } from "./provider/QeetIDProvider";
export { defaultLocalization } from "./provider/localization";
export type { QeetIDLocalization } from "./provider/localization";

export { useSession } from "./hooks/useSession";
export type { UseSessionResult } from "./hooks/useSession";
export { useUser } from "./hooks/useUser";
export type { UseUserResult } from "./hooks/useUser";
export { useOrganization } from "./hooks/useOrganization";
export type { UseOrganizationResult } from "./hooks/useOrganization";
export { useQeetID } from "./hooks/useQeetID";
export type { QeetIDActions } from "./hooks/useQeetID";

export { SignedIn } from "./components/SignedIn";
export type { SignedInProps } from "./components/SignedIn";
export { SignedOut } from "./components/SignedOut";
export type { SignedOutProps } from "./components/SignedOut";
export { Protect } from "./components/Protect";
export type { ProtectProps } from "./components/Protect";
export { SignInButton } from "./components/SignInButton";
export type { SignInButtonProps } from "./components/SignInButton";
export { SignUpButton } from "./components/SignUpButton";
export type { SignUpButtonProps } from "./components/SignUpButton";
export { SignOutButton } from "./components/SignOutButton";
export type { SignOutButtonProps } from "./components/SignOutButton";
export { UserButton } from "./components/UserButton";
export type { UserButtonMenuItem, UserButtonPart, UserButtonProps } from "./components/UserButton";
export { OrganizationSwitcher } from "./components/OrganizationSwitcher";
export type { OrganizationSwitcherPart, OrganizationSwitcherProps } from "./components/OrganizationSwitcher";
export type { StylingProps } from "./components/internal/classNames";
export type { TriggerButtonProps } from "./components/internal/Trigger";

export type { AccessCheck } from "./core/access";
export type { SignInOptions } from "./core/navigation";
export type { PendingAction, SessionEndReason, SessionState, SessionStatus, SignOutOptions } from "./core/store";

export { QeetIDError } from "./errors";
export type { QeetIDErrorCode, QeetIDErrorOptions } from "./errors";
export type { Session, SessionOrganization, SessionUser } from "./contract";
export { VERSION } from "./version";
