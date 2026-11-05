// A client-only app (Vite, Create React App): the provider reads the session from /auth/session.
import { OrganizationSwitcher, Protect, QeetIDProvider, SignedIn, SignedOut, SignInButton, UserButton, useSession } from "@qeet-id/react";
import "@qeet-id/react/styles.css";
import type { ReactElement } from "react";

const organizations = [
  { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: "Brightleaf Foods" },
  { id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", name: "Brightleaf Exports" },
];

export function App(): ReactElement {
  return (
    <QeetIDProvider onSignOut={(reason) => reason === "expired" && console.info("Session expired")}>
      <header>
        <SignedIn>
          <OrganizationSwitcher organizations={organizations} afterSwitchUrl="/invoices" />
          <UserButton showName menuItems={[{ label: "Your account", href: "/account" }]} />
        </SignedIn>
        <SignedOut>
          <SignInButton returnTo="/invoices" />
        </SignedOut>
      </header>
      <SessionNotice />
      <Protect redirectToSignIn loading={<p>Checking your session…</p>}>
        <Invoices />
      </Protect>
    </QeetIDProvider>
  );
}

function SessionNotice(): ReactElement | null {
  const { status, endReason, error, refresh } = useSession();
  if (status === "unavailable") {
    return (
      <p role="alert">
        We couldn't check your session ({error?.code}).{" "}
        <button type="button" onClick={() => refresh().catch(() => {})}>
          Try again
        </button>
      </p>
    );
  }
  if (status === "signed-out" && endReason === "expired") return <p role="status">Your session expired. Sign in again.</p>;
  return null;
}

function Invoices(): ReactElement {
  return (
    <main>
      <h1>Invoices</h1>
      <Protect permission="invoice.approve" fallback={<p>Ask a finance approver to approve invoices.</p>}>
        <button type="button">Approve selected</button>
      </Protect>
    </main>
  );
}
