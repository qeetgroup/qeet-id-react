/**
 * `@qeet-id/react/testing`: render components that use the session with a
 * session you choose, in Vitest, Jest or Storybook, without a server.
 *
 * ```tsx
 * import { QeetIDTestProvider, createTestSession } from "@qeet-id/react/testing";
 *
 * render(
 *   <QeetIDTestProvider session={createTestSession()}>
 *     <Header />
 *   </QeetIDTestProvider>,
 * );
 * ```
 *
 * @packageDocumentation
 */
export { QeetIDTestProvider } from "./testing/QeetIDTestProvider";
export type { QeetIDTestProviderProps } from "./testing/QeetIDTestProvider";
export { createTestSession } from "./testing/createTestSession";
export type { TestSessionOverrides } from "./testing/createTestSession";
