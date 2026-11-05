"use client";

// Callbacks are functions, so they are set in a Client Component.
import { QeetIDProvider } from "@qeet-id/react";
import type { Session } from "@qeet-id/react/contract";
import type { ReactElement, ReactNode } from "react";

/** Stands in for the app's data cache. */
declare const queryClient: { clear(): void };

export function Providers({ session, children }: { session: Session | null; children: ReactNode }): ReactElement {
  return (
    <QeetIDProvider
      initialSession={session}
      onSessionChange={(next, previous) => {
        // A different person or organisation must never see the previous one's data.
        if (next?.user.id !== previous?.user.id || next?.organization?.id !== previous?.organization?.id) queryClient.clear();
      }}
    >
      {children}
    </QeetIDProvider>
  );
}
