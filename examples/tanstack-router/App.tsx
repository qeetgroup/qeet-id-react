// TanStack Router, using RequireAuth inside a route component (the
// simplest integration — see the react-router example for the same
// pattern) plus useAuth for the signed-in view. Wire QeetIDProvider at
// your root route's component, same as any other router.
//
//   npm install @tanstack/react-router @qeet-id/react
import { QeetIDProvider, RequireAuth, useAuth } from "@qeet-id/react";

export function RootLayout({ children }: { children: React.ReactNode }) {
  return <QeetIDProvider apiUrl="https://api.id.qeet.in">{children}</QeetIDProvider>;
}

export function DashboardRoute() {
  return (
    <RequireAuth fallback={<p>Please sign in to view this page.</p>}>
      <Dashboard />
    </RequireAuth>
  );
}

function Dashboard() {
  const { userId } = useAuth();
  return <p>Signed in as {userId}.</p>;
}
