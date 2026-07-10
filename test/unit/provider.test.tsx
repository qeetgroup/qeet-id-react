import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QeetIDProvider } from "../../src/client/provider.js";
import { useQeetIDClient, usePaths } from "../../src/client/context.js";
import { useAuth } from "../../src/hooks/authentication/useAuth.js";
import { useUser } from "../../src/hooks/identity/useUser.js";

describe("QeetIDProvider", () => {
  it("defaults to redirect mode (no apiUrl -> no client) with default paths", () => {
    const { result } = renderHook(() => ({ client: useQeetIDClient(), paths: usePaths() }), {
      wrapper: ({ children }) => <QeetIDProvider>{children}</QeetIDProvider>,
    });

    expect(result.current.client).toBeNull();
    expect(result.current.paths).toEqual({
      loginUrl: "/api/auth/login",
      logoutUrl: "/api/auth/logout",
      signUpUrl: "/api/auth/sign-up",
    });
  });

  it("constructs a client in embedded mode when apiUrl is set", () => {
    const { result } = renderHook(() => useQeetIDClient(), {
      wrapper: ({ children }) => <QeetIDProvider apiUrl="https://api.id.qeet.in">{children}</QeetIDProvider>,
    });

    expect(result.current).not.toBeNull();
  });

  it("honors custom redirect paths", () => {
    const { result } = renderHook(() => usePaths(), {
      wrapper: ({ children }) => (
        <QeetIDProvider loginUrl="/custom/login" logoutUrl="/custom/logout" signUpUrl="/custom/sign-up">
          {children}
        </QeetIDProvider>
      ),
    });

    expect(result.current).toEqual({ loginUrl: "/custom/login", logoutUrl: "/custom/logout", signUpUrl: "/custom/sign-up" });
  });

  it("seeds useAuth/useUser from initialState (SSR hydration)", () => {
    function Probe() {
      const auth = useAuth();
      const { user } = useUser();
      return (
        <div>
          <span data-testid="authed">{String(auth.isAuthenticated)}</span>
          <span data-testid="user-id">{auth.userId}</span>
          <span data-testid="email">{user?.email}</span>
        </div>
      );
    }

    render(
      <QeetIDProvider initialState={{ isAuthenticated: true, userId: "u1", user: { email: "a@b.com" } }}>
        <Probe />
      </QeetIDProvider>,
    );

    expect(screen.getByTestId("authed").textContent).toBe("true");
    expect(screen.getByTestId("user-id").textContent).toBe("u1");
    expect(screen.getByTestId("email").textContent).toBe("a@b.com");
  });

  it("defaults to signed-out, isLoaded=true state with no initialState", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <QeetIDProvider>{children}</QeetIDProvider>,
    });

    expect(result.current).toMatchObject({ isLoaded: true, isAuthenticated: false });
  });
});
