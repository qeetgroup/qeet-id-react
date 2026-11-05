/**
 * `@qeet-id/react`: the provider, hooks and components for a React app whose
 * people sign in on Qeet ID's hosted pages and whose session lives on its own
 * server.
 *
 * ```tsx
 * import { QeetIDProvider, useSession } from "@qeet-id/react";
 *
 * <QeetIDProvider initialSession={session}>
 *   <App />
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

export type { AccessCheck } from "./core/access";
export type { SignInOptions } from "./core/navigation";
export type { PendingAction, SessionEndReason, SessionState, SessionStatus, SignOutOptions } from "./core/store";

export { QeetIDError } from "./errors";
export type { QeetIDErrorCode, QeetIDErrorOptions } from "./errors";
export type { Session, SessionOrganization, SessionUser } from "./contract";
export { VERSION } from "./version";
