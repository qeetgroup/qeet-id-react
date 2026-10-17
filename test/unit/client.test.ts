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

  it("signIn reports an enrolment challenge when the account must set up a second factor", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        mfa_required: true,
        mfa_token: "tok_2",
        methods: ["totp"],
        factors: [],
        enrollment_required: true,
        enrollment_due_at: "2026-11-01T00:00:00Z",
      }),
    );

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    const result = await client.signIn({ email: "a@b.com", password: "secret123" });

    expect(result).toEqual({
      status: "needs_mfa",
      mfaToken: "tok_2",
      methods: ["totp"],
      enrollmentRequired: true,
      enrollmentDueAt: "2026-11-01T00:00:00Z",
    });
  });

  it("sets up an authenticator app for the challenge and returns the recovery codes its confirmation mints", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { secret: "JBSWY3DP", provisioning_url: "otpauth://totp/x?secret=JBSWY3DP" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user_id: "u1", recovery_codes: ["aaaa-bbbb"] }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.startMfaEnrollment("tok_2")).resolves.toEqual({
      secret: "JBSWY3DP",
      provisioningUrl: "otpauth://totp/x?secret=JBSWY3DP",
    });
    await expect(client.verifyMfa({ mfaToken: "tok_2", code: "123456" })).resolves.toEqual({ recoveryCodes: ["aaaa-bbbb"] });

    const [enrollUrl, enrollInit] = fetchMock.mock.calls[0]!;
    expect(enrollUrl).toBe("https://api.id.qeet.in/v1/auth/mfa/enroll");
    expect(JSON.parse(enrollInit.body as string)).toEqual({ mfa_token: "tok_2" });
    const [verifyUrl] = fetchMock.mock.calls[1]!;
    expect(verifyUrl).toBe("https://api.id.qeet.in/v1/auth/session/mfa");
  });

  it("skips the setup with skip: true", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user_id: "u1" }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await client.skipMfaEnrollment("tok_2");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.id.qeet.in/v1/auth/session/mfa");
    expect(JSON.parse(init.body as string)).toEqual({ mfa_token: "tok_2", skip: true });
  });

  it("signUp reports the enrolment challenge an organisation requiring MFA answers", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, { user_id: "u2", mfa_required: true, mfa_token: "tok_3", methods: ["totp"], enrollment_required: true }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { user_id: "u3" }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.signUp({ tenantId: "t1", email: "n@b.com", password: "secret123" })).resolves.toEqual({
      status: "needs_mfa",
      mfaToken: "tok_3",
      methods: ["totp"],
      enrollmentRequired: true,
    });
    await expect(client.signUp({ tenantId: "t1", email: "m@b.com", password: "secret123" })).resolves.toEqual({ status: "complete" });
  });

  it("magicLink.consume reports the challenge a link for an account holding a second factor answers", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { mfa_required: true, mfa_token: "tok_m", methods: ["totp"] }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { access_token: "a", user_id: "u1" }));

    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.magicLink.consume("link_1")).resolves.toEqual({ status: "needs_mfa", mfaToken: "tok_m", methods: ["totp"] });
    await expect(client.magicLink.consume("link_2")).resolves.toEqual({ status: "complete", userId: "u1" });
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

  describe("passkey enrolment with the hosted-login session", () => {
    const create = vi.fn();
    beforeEach(() => {
      create.mockReset();
      create.mockResolvedValue({ toJSON: () => ({ id: "cred-1", type: "public-key" }) });
      vi.stubGlobal("PublicKeyCredential", { parseCreationOptionsFromJSON: (o: unknown) => o });
      Object.defineProperty(navigator, "credentials", { value: { create }, configurable: true });
    });
    afterEach(() => {
      Reflect.deleteProperty(navigator, "credentials");
    });

    it("passkeys.register sends the session cookie and the CSRF token on both ceremony steps", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { session_id: "ceremony-1", publicKey: { challenge: "abc" } }));
      fetchMock.mockResolvedValueOnce(jsonResponse(204, null));

      const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
      await client.passkeys.register();

      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        "https://api.id.qeet.in/v1/passkeys/register/begin",
        "https://api.id.qeet.in/v1/passkeys/register/finish",
      ]);
      for (const [, init] of fetchMock.mock.calls) {
        expect(init.method).toBe("POST");
        expect(init.credentials).toBe("include");
        expect(new Headers(init.headers as HeadersInit).get("X-CSRF-Token")).toBe("tok_csrf_seeded");
      }
      expect(create).toHaveBeenCalledWith({ publicKey: { challenge: "abc" } });
      // No name: the server names the passkey after the browser.
      expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string)).toEqual({
        session_id: "ceremony-1",
        credential: { id: "cred-1", type: "public-key" },
      });
    });

    it("passkeys.register sends a name the user chose, trimmed", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { session_id: "ceremony-2", publicKey: {} }));
      fetchMock.mockResolvedValueOnce(jsonResponse(204, null));

      const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
      await client.passkeys.register({ name: "  Work laptop  " });

      expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string)).toMatchObject({ name: "Work laptop" });
    });

    it("passkeys.register surfaces an organization with passkeys switched off", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse(403, { error: { code: "passkey.disabled", message: "Your organization has turned off passkeys." } }),
      );

      const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
      await expect(client.passkeys.register()).rejects.toMatchObject({ status: 403, code: "passkey.disabled" });
      expect(create).not.toHaveBeenCalled();
    });

    it("passkeys.list sends the session cookie and no CSRF token (a read)", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [], enrollment_allowed: true }));

      const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
      await client.passkeys.list();

      const [, init] = fetchMock.mock.calls[0]!;
      expect(init.method).toBe("GET");
      expect(init.credentials).toBe("include");
      expect(new Headers(init.headers as HeadersInit).get("X-CSRF-Token")).toBeNull();
    });
  });
});

describe("passkeys.autofill", () => {
  const begin = { session_id: "s1", publicKey: { challenge: "c" } };
  let get: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    document.cookie = "qe_csrf=tok_csrf_seeded";
    get = vi.fn();
    vi.stubGlobal("PublicKeyCredential", { isConditionalMediationAvailable: () => Promise.resolve(true) });
    Object.defineProperty(navigator, "credentials", { value: { get }, configurable: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  });

  it("does nothing where the browser lacks conditional mediation", async () => {
    vi.stubGlobal("PublicKeyCredential", { isConditionalMediationAvailable: () => Promise.resolve(false) });
    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.passkeys.autofill(new AbortController().signal)).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signs in with the passkey picked from the browser prompt, asking for conditional mediation", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, begin)).mockResolvedValueOnce(jsonResponse(204, null));
    get.mockResolvedValueOnce({ toJSON: () => ({ id: "cred" }) });
    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });

    await expect(client.passkeys.autofill(new AbortController().signal)).resolves.toBe(true);
    expect(get.mock.calls[0]![0].mediation).toBe("conditional");
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("https://api.id.qeet.in/v1/passkeys/login/finish");
    expect(JSON.parse(init.body as string)).toEqual({ session_id: "s1", credential: { id: "cred" } });
  });

  it("is abandoned silently when stopped", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, begin));
    get.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const c = new AbortController();
    c.abort();
    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.passkeys.autofill(c.signal)).resolves.toBe(false);
  });

  it("starts a fresh ceremony when the first one's state has expired", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, begin))
      .mockResolvedValueOnce(jsonResponse(400, { error: { code: "auth.session_expired", message: "expired" } }))
      .mockResolvedValueOnce(jsonResponse(200, { ...begin, session_id: "s2" }))
      .mockResolvedValueOnce(jsonResponse(204, null));
    get.mockResolvedValue({ toJSON: () => ({ id: "cred" }) });
    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });

    await expect(client.passkeys.autofill(new AbortController().signal)).resolves.toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[3]![1].body as string).session_id).toBe("s2");
  });

  it("reports a picked passkey the server refuses", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, begin))
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: "passkey.clone_detected", message: "refused" } }));
    get.mockResolvedValueOnce({ toJSON: () => ({ id: "cred" }) });
    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.passkeys.autofill(new AbortController().signal)).rejects.toMatchObject({ code: "passkey.clone_detected" });
  });
});

describe("sessions.list", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the { items } envelope of GET /v1/auth/sessions", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { items: [{ id: "s1", device: "Chrome on macOS", current: true }], has_more: false, total: 1 }),
    );
    const client = new QeetIDClient({ apiUrl: "https://api.id.qeet.in" });
    await expect(client.sessions.list()).resolves.toEqual([{ id: "s1", device: "Chrome on macOS", current: true }]);
  });
});
