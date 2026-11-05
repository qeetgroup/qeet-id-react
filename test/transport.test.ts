import { describe, expect, it, vi } from "vitest";
import { sessionRoutes } from "../src/contract";
import { fetchTransport } from "../src/core/transport";
import { QeetIDError } from "../src/errors";
import { meera } from "./fixtures";
import { mockSessionRoutes, sessionAnswer } from "./helpers";

const transport = fetchTransport(sessionRoutes());

async function failure(promise: Promise<unknown>): Promise<QeetIDError> {
  const error = await promise.then(
    () => {
      throw new Error("expected a failure");
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(QeetIDError);
  return error as QeetIDError;
}

describe("fetchTransport: the request", () => {
  it("reads the session from the app's own origin with the CSRF header and no caching", async () => {
    const routes = mockSessionRoutes({ session: [sessionAnswer(meera)] });
    await expect(transport.getSession()).resolves.toEqual(meera);
    const [call] = routes.calls;
    expect(call).toMatchObject({ method: "GET", url: "/auth/session", body: undefined });
    expect(call?.headers).toEqual({ accept: "application/json", "x-qeet-id-request": "1" });
    expect(call?.init).toMatchObject({ credentials: "same-origin", cache: "no-store", redirect: "manual" });
  });

  it("posts JSON with the CSRF header", async () => {
    const routes = mockSessionRoutes({
      "sign-out": [{ body: { redirectTo: "/" } }],
      "switch-organization": [{ body: { session: meera } }],
    });
    await transport.signOut({ returnTo: "/goodbye" });
    await transport.switchOrganization({ organizationId: "5f0c1d2e" });
    expect(routes.calls.map(({ method, url, headers, body }) => ({ method, url, headers, body }))).toEqual([
      {
        method: "POST",
        url: "/auth/sign-out",
        headers: { accept: "application/json", "content-type": "application/json", "x-qeet-id-request": "1" },
        body: { returnTo: "/goodbye" },
      },
      {
        method: "POST",
        url: "/auth/switch-organization",
        headers: { accept: "application/json", "content-type": "application/json", "x-qeet-id-request": "1" },
        body: { organizationId: "5f0c1d2e" },
      },
    ]);
  });

  it("never sends an Authorization header or a token", async () => {
    const routes = mockSessionRoutes({ session: [sessionAnswer(meera)] });
    await transport.getSession();
    expect(Object.keys(routes.calls[0]?.headers ?? {})).not.toContain("authorization");
  });
});

describe("fetchTransport: answers", () => {
  it("answers null when nobody is signed in", async () => {
    mockSessionRoutes({ session: [sessionAnswer(null)] });
    await expect(transport.getSession()).resolves.toBeNull();
  });

  it("returns sign-out's redirect and the switch's session", async () => {
    mockSessionRoutes({
      "sign-out": [{ body: { redirectTo: "https://id.qeet.in/v1/oauth/logout" } }],
      "switch-organization": [{ body: { session: meera } }],
    });
    await expect(transport.signOut({})).resolves.toEqual({ redirectTo: "https://id.qeet.in/v1/oauth/logout" });
    await expect(transport.switchOrganization({ organizationId: "x" })).resolves.toEqual(meera);
  });

  it.each([
    ["JSON that isn't { session }", { body: { user: meera.user } }, 'answered with JSON that isn\'t { "session": … }'],
    ["a session that doesn't fit", { body: { session: { ...meera, user: {} } } }, "session.user.id must be a non-empty string"],
    ["the app's HTML", { text: "<!doctype html><title>Brightleaf</title>" }, "didn't answer with JSON"],
    ["an empty body", { text: "" }, "didn't answer with JSON"],
  ])("refuses %s as invalid_response", async (_label, answer, message) => {
    mockSessionRoutes({ session: [answer] });
    const error = await failure(transport.getSession());
    expect(error.code).toBe("invalid_response");
    expect(error.message).toContain(message);
  });

  it.each([["javascript:alert(1)"], ["data:text/html,hi"], [""], [42]])("refuses the sign-out redirect %j", async (redirectTo) => {
    mockSessionRoutes({ "sign-out": [{ body: { redirectTo } }] });
    expect((await failure(transport.signOut({}))).code).toBe("invalid_response");
  });

  it("refuses a switch answer without a session", async () => {
    mockSessionRoutes({ "switch-organization": [{ body: { redirectTo: "/" } }] });
    expect((await failure(transport.switchOrganization({ organizationId: "x" }))).code).toBe("invalid_response");
  });
});

describe("fetchTransport: errors", () => {
  it("takes the code and message of the contract's error envelope", async () => {
    mockSessionRoutes({
      "switch-organization": [
        { status: 403, body: { error: { code: "organization_switch_refused", message: "Not a member of Acme Traders." } } },
      ],
    });
    const error = await failure(transport.switchOrganization({ organizationId: "x" }));
    expect(error).toMatchObject({ code: "organization_switch_refused", status: 403, message: "Not a member of Acme Traders." });
  });

  it("names http_<status> when the answer has no code, and hints at an unmounted route on 404", async () => {
    mockSessionRoutes({ session: [{ status: 404, text: "Not Found" }] });
    const error = await failure(transport.getSession());
    expect(error).toMatchObject({ code: "http_404", status: 404 });
    expect(error.message).toBe("GET /auth/session was not found. Is the session route mounted at this path?");
    mockSessionRoutes({ session: [{ status: 502, body: { error: {} } }] });
    expect(await failure(transport.getSession())).toMatchObject({
      code: "http_502",
      message: "GET /auth/session failed with HTTP status 502.",
    });
  });

  it("calls a request with no answer a network_error, keeping the cause", async () => {
    mockSessionRoutes({ session: [new TypeError("Failed to fetch")] });
    const error = await failure(transport.getSession());
    expect(error).toMatchObject({ code: "network_error", cause: new TypeError("Failed to fetch") });
  });

  it("refuses a redirect: a session route answers JSON", async () => {
    // What fetch answers for a redirect with redirect: "manual".
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ type: "opaqueredirect", status: 0, ok: false, text: async () => "" })),
    );
    const error = await failure(transport.getSession());
    expect(error.code).toBe("invalid_response");
    expect(error.message).toContain("answered with a redirect");
    expect(error.status).toBeUndefined();
    mockSessionRoutes({ session: [{ status: 302, text: "" }] });
    expect(await failure(transport.getSession())).toMatchObject({ code: "invalid_response", status: 302 });
  });
});
