// app/layout.tsx in a Next.js App Router app: a Server Component.
// The server SDK reads the session cookie; the provider renders the right UI on the first paint.
import type { Session } from "@qeet-id/react/contract";
import type { ReactElement, ReactNode } from "react";
import { Providers } from "./providers";

/** Stands in for the server SDK's helper that reads the session cookie. */
declare function getSession(): Promise<Session | null>;

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  const session = await getSession();
  return (
    <html lang="en-IN">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
