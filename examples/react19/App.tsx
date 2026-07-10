// React 19 — this package's hooks are plain useState/useEffect/useCallback
// (no experimental APIs), so nothing here is React-19-specific beyond using
// its `use()` hook to read a promise-based value where that's convenient
// (e.g. resolving the initial session before first paint in a framework
// that supports it) and the `action` prop on <form> for the sign-in submit.
//
//   npm install react@19 react-dom@19 @qeet-id/react
import { useActionState } from "react";
import { QeetIDProvider, useSignIn } from "@qeet-id/react";

export default function App() {
  return (
    <QeetIDProvider apiUrl="https://api.id.qeet.in">
      <SignInForm />
    </QeetIDProvider>
  );
}

function SignInForm() {
  const { signIn, status } = useSignIn();

  const [, formAction, isPending] = useActionState(async (_prev: unknown, formData: FormData) => {
    await signIn({ email: String(formData.get("email")), password: String(formData.get("password")) });
    return null;
  }, null);

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isPending || status.step === "loading"}>
        Sign in
      </button>
      {status.step === "error" && <p role="alert">{status.error}</p>}
    </form>
  );
}
