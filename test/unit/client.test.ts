import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "../../src/errors/AuthenticationError.js";
import { QeetIDClient } from "../../src/client/client.js";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  // Fetch spec: 204/205/304 responses must have a null body.
  const payload = status === 204 ? null : JSON.stringify(body);
  return new Response(payload, { status, headers: { "content-type": "application/json", ...headers } });
}

describe("QeetIDClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Pre-seed the CSRF cookie so mutating calls skip the best-effort /healthz
    // seed fetch — that behavior gets its own dedicated test below.
    document.cookie = "qe_csrf=tok_csrf_seeded";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  });

  it("signIn posts to /v1/auth/session with credentials included", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user_id: "u1" }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    const result = await client.signIn({ email: "a@b.com", password: "secret123" });

    expect(result).toEqual({ status: "complete", userId: "u1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.id.qeet.in/v1/auth/session");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ email: "a@b.com", password: "secret123" });
  });

  it("signIn reports needs_mfa when the backend requires a second factor", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { mfa_required: true, mfa_token: "tok_1", methods: ["totp"] }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    const result = await client.signIn({ email: "a@b.com", password: "secret123" });

    expect(result).toEqual({ status: "needs_mfa", mfaToken: "tok_1", methods: ["totp"] });
  });

  it("currentUser returns null on a 401 instead of throwing", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "unauthorized", message: "no session" } }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.currentUser()).resolves.toBeNull();
  });

  it("currentUser rethrows a non-401 error", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: { code: "internal", message: "boom" } }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.currentUser()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("echoes the CSRF cookie as a header on mutating requests", async () => {
    document.cookie = "qe_csrf=tok_csrf_1";
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(204, null));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await client.signOut();

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("X-CSRF-Token")).toBe("tok_csrf_1");
  });

  it("seeds the CSRF cookie with a best-effort GET when it's missing", async () => {
    document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC"; // undo beforeEach's seed for this test
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 })); // /healthz seed attempt
    fetchMock.mockResolvedValueOnce(jsonResponse(204, null)); // the actual mutation

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await client.signOut();

    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.id.qeet.in/healthz");
  });

  it("switchTenant posts the tenant_id field", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(204, null));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await client.switchTenant("t_123");

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toEqual({ tenant_id: "t_123" });
  });

  it("socialStartUrl builds an absolute URL with tenant_id and return_to", () => {
    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    const url = client.socialStartUrl({ provider: "google", tenantId: "t1", returnTo: "/dashboard" });
    expect(url).toBe("https://api.id.qeet.in/v1/social/google/start?tenant_id=t1&return_to=%2Fdashboard");
  });

  it("passkeys.list reads the { items } envelope of GET /v1/passkeys and camelCases it", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          {
            id: "pk1",
            user_id: "u1",
            name: "Chrome on macOS",
            transports: ["internal"],
            last_used_at: null,
            created_at: "2026-10-01T10:00:00Z",
          },
          {
            id: "pk2",
            user_id: "u1",
            name: null,
            transports: null,
            last_used_at: "2026-10-02T10:00:00Z",
            created_at: "2026-09-01T10:00:00Z",
          },
        ],
      }),
    );

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    const list = await client.passkeys.list();

    expect(list).toEqual([
      { id: "pk1", name: "Chrome on macOS", transports: ["internal"], lastUsedAt: null, createdAt: "2026-10-01T10:00:00Z" },
      { id: "pk2", name: null, transports: [], lastUsedAt: "2026-10-02T10:00:00Z", createdAt: "2026-09-01T10:00:00Z" },
    ]);
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.id.qeet.in/v1/passkeys");
  });

  it("passkeys.rename PATCHes the name with the CSRF header and returns the renamed passkey", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: "pk1",
        user_id: "u1",
        name: "Work laptop",
        transports: ["internal"],
        last_used_at: null,
        created_at: "2026-10-01T10:00:00Z",
      }),
    );

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    const renamed = await client.passkeys.rename("pk1", "Work laptop");

    expect(renamed).toEqual({
      id: "pk1",
      name: "Work laptop",
      transports: ["internal"],
      lastUsedAt: null,
      createdAt: "2026-10-01T10:00:00Z",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.id.qeet.in/v1/passkeys/pk1");
    expect(init.method).toBe("PATCH");
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers as HeadersInit).get("X-CSRF-Token")).toBe("tok_csrf_seeded");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Work laptop" });
  });

  it("passkeys.rename surfaces a refused name as an AuthenticationError", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, { error: { code: "validation_failed", message: "One or more fields are invalid." } }),
    );

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.passkeys.rename("pk1", "   ")).rejects.toMatchObject({ status: 422, code: "validation_failed" });
  });
});
