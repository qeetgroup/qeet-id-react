// Electron renderer process using redirect mode is awkward (no browser
// chrome to redirect within), so an Electron app should use embedded mode
// and open the OAuth/social flows (client.socialStartUrl) in a
// BrowserWindow/shell.openExternal rather than window.location — cookies
// still work identically inside the renderer's own fetch/credentials
// handling as long as the app talks to the real api.id.qeet.in origin
// (not a custom app:// scheme, which cookies can't attach to).
//
//   npm install electron @qeet-id/react
import { QeetIDProvider, SignedIn, SignedOut, SignIn, useUser } from "@qeet-id/react";

export default function App() {
  return (
    <QeetIDProvider apiUrl="https://api.id.qeet.in">
      <SignedIn>
        <Profile />
      </SignedIn>
      <SignedOut>
        <SignIn />
      </SignedOut>
    </QeetIDProvider>
  );
}

function Profile() {
  const { user } = useUser();
  return <p>Signed in as {user?.email ?? "unknown"}.</p>;
}
