/** What one tab tells the app's other tabs. It carries no personal data. */
export type TabMessage = { type: "signed-out" } | { type: "changed" };

/** The app's other tabs on this origin. */
export interface TabChannel {
  post(message: TabMessage): void;
  listen(listener: (message: TabMessage) => void): () => void;
  close(): void;
}

/**
 * A `BroadcastChannel` named after the session route, so two apps on one
 * origin with different base paths don't hear each other. `null` where the
 * browser has no `BroadcastChannel`; focus checks still catch up there.
 */
export function openTabChannel(sessionRoute: string): TabChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const channel = new BroadcastChannel(`qeet-id:${sessionRoute}`);
  return {
    post(message) {
      channel.postMessage(message);
    },
    listen(listener) {
      const onMessage = (event: MessageEvent): void => {
        const data: unknown = event.data;
        if (
          typeof data === "object" &&
          data !== null &&
          ((data as TabMessage).type === "signed-out" || (data as TabMessage).type === "changed")
        ) {
          listener({ type: (data as TabMessage).type });
        }
      };
      channel.addEventListener("message", onMessage);
      return () => channel.removeEventListener("message", onMessage);
    },
    close() {
      channel.close();
    },
  };
}
