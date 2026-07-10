// A plain Vite + React SPA using redirect mode (no apiUrl) — the SDK reads
// server-computed initialState and points the trigger buttons at your own
// hosted-login routes.
//
//   npm install vite @vitejs/plugin-react react react-dom @qeet-id/react
import { QeetIDProvider, SignedIn, SignedOut, SignInButton, useUser } from "@qeet-id/react";
import { UserButton } from "@qeet-id/react";

export default function App() {
  return (
    <QeetIDProvider loginUrl="/auth/login" logoutUrl="/auth/logout" signUpUrl="/auth/sign-up">
      <Header />
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <p>
          <SignInButton>Sign in to continue</SignInButton>
        </p>
      </SignedOut>
    </QeetIDProvider>
  );
}

function Header() {
  return (
    <header style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}>
      <UserButton />
    </header>
  );
}

function Dashboard() {
  const { user } = useUser();
  return <p>Welcome back{user?.displayName ? `, ${user.displayName}` : ""}.</p>;
}
