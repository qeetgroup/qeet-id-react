import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QeetIDProvider } from "../../src/client/provider.js";
import { useSignIn } from "../../src/hooks/authentication/useSignIn.js";
import { useSession } from "../../src/hooks/authentication/useSession.js";

function jsonResponse(status: number, body: unknown): Response {
  // Fetch spec: 204/205/304 responses must have a null body.
  const payload = status === 204 ? null : JSON.stringify(body);
  return new Response(payload, { status, headers: { "content-type": "application/json" } });
}

const embeddedWrapper = ({ children }: { children: React.ReactNode }) => <QeetIDProvider apiUrl="https://api.id.qeet.in">{children}</QeetIDProvider>;
const redirectWrapper = ({ children }: { children: React.ReactNode }) => <QeetIDProvider>{children}</QeetIDProvider>;

describe("useSignIn", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Pre-seed the CSRF cookie so mutating calls (POST/DELETE) skip the
    // best-effort /healthz seed fetch — that path has its own dedicated
    // test in client.test.ts.
    document.cookie = "qe_csrf=tok_csrf_seeded";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  });

  it("starts idle, transitions through loading to complete on success", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user_id: "u1" }));

    const { result } = renderHook(() => useSignIn(), { wrapper: embeddedWrapper });
    expect(result.current.status).toEqual({ step: "idle" });

    await act(async () => {
      await result.current.signIn({ email: "a@b.com", password: "secret123" });
    });

    expect(result.current.status).toEqual({ step: "complete" });
  });

  it("transitions to needs_mfa and then complete after verifyMfa", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { mfa_required: true, mfa_token: "tok_1", methods: ["totp"] }));
    fetchMock.mockResolvedValueOnce(jsonResponse(204, null));

    const { result } = renderHook(() => useSignIn(), { wrapper: embeddedWrapper });

    await act(async () => {
      await result.current.signIn({ email: "a@b.com", password: "secret123" });
    });
    expect(result.current.status).toEqual({ step: "needs_mfa", mfaToken: "tok_1" });

    await act(async () => {
      await result.current.verifyMfa({ code: "123456" });
    });
    expect(result.current.status).toEqual({ step: "complete" });
  });

  it("catches a failure into status.error instead of throwing", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "invalid_credentials", message: "wrong password" } }));

    const { result } = renderHook(() => useSignIn(), { wrapper: embeddedWrapper });

    await act(async () => {
      await result.current.signIn({ email: "a@b.com", password: "wrong" });
    });

    expect(result.current.status).toEqual({ step: "error", error: "wrong password" });
  });

  it("reset() returns to idle", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "invalid_credentials", message: "wrong password" } }));

    const { result } = renderHook(() => useSignIn(), { wrapper: embeddedWrapper });
    await act(async () => {
      await result.current.signIn({ email: "a@b.com", password: "wrong" });
    });
    act(() => result.current.reset());

    expect(result.current.status).toEqual({ step: "idle" });
  });

  it("throws synchronously when apiUrl isn't configured (redirect mode)", async () => {
    const { result } = renderHook(() => useSignIn(), { wrapper: redirectWrapper });
    await expect(result.current.signIn({ email: "a@b.com", password: "x" })).rejects.toThrow(/requires apiUrl/);
  });
});

describe("useSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Pre-seed the CSRF cookie so mutating calls (POST/DELETE) skip the
    // best-effort /healthz seed fetch — that path has its own dedicated
    // test in client.test.ts.
    document.cookie = "qe_csrf=tok_csrf_seeded";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  });

  it("loads sessions on mount and revoke removes it from the list", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: "s1", current: true }, { id: "s2" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse(204, null));

    const { result } = renderHook(() => useSession(), { wrapper: embeddedWrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.sessions).toHaveLength(2);

    await act(async () => {
      await result.current.revoke("s2");
    });

    expect(result.current.sessions.map((s) => s.id)).toEqual(["s1"]);
  });

  it("stays isLoaded=false forever in redirect mode (no client to fetch from)", () => {
    const { result } = renderHook(() => useSession(), { wrapper: redirectWrapper });
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.sessions).toEqual([]);
  });
});
