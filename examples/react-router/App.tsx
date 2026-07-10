// React Router (data mode) using embedded mode (apiUrl set) — the SDK
// drives sign-in directly against the API via the embedded <SignIn/> form,
// no redirect to a hosted page.
//
//   npm install react-router-dom @qeet-id/react
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { QeetIDProvider, RequireAuth, SignIn, useAuth } from "@qeet-id/react";

export default function App() {
  return (
    <QeetIDProvider apiUrl="https://api.id.qeet.in">
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth fallback={<Navigate to="/sign-in" replace />}>
              <Dashboard />
            </RequireAuth>
          }
        />
      </Routes>
    </QeetIDProvider>
  );
}

function SignInPage() {
  const navigate = useNavigate();
  return <SignIn onSuccess={() => navigate("/dashboard")} />;
}

function Dashboard() {
  const { userId } = useAuth();
  return <p>Signed in as {userId}.</p>;
}
