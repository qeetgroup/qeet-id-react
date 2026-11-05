// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  AUTH_ERROR_PARAMETER,
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
  DEFAULT_BASE_PATH,
  type ErrorResponse,
  MAX_RETURN_TO_LENGTH,
  parseSession,
  SESSION_ROUTES,
  SIGN_IN_PARAMETERS,
  type Session,
  type SessionErrorCode,
  type SessionOrganization,
  type SessionResponse,
  type SessionRouteName,
  type SessionUser,
  type SignOutRequest,
  type SignOutResponse,
  type SwitchOrganizationRequest,
  type SwitchOrganizationResponse,
  safeReturnTo,
  sessionRoutes,
} from "../src/contract";
import { arjun, meera, origin } from "./fixtures";

describe("sessionRoutes", () => {
  it("puts every route under /auth by default", () => {
    expect(DEFAULT_BASE_PATH).toBe("/auth");
    expect(sessionRoutes()).toEqual({
      signIn: "/auth/sign-in",
      signUp: "/auth/sign-up",
      callback: "/auth/callback",
      session: "/auth/session",
      signOut: "/auth/sign-out",
      switchOrganization: "/auth/switch-organization",
    });
    expect(Object.isFrozen(sessionRoutes())).toBe(true);
  });

  it("takes another base path, with or without a trailing slash, or the root", () => {
    expect(sessionRoutes("/api/identity").session).toBe("/api/identity/session");
    expect(sessionRoutes("/api/identity/").signOut).toBe("/api/identity/sign-out");
    expect(sessionRoutes("/").signIn).toBe("/sign-in");
  });

  it.each(["auth", "//evil.example/auth", "/auth?x=1", "/auth#top", "/au th", "/auth\\x", "https://app.brightleaffoods.in/auth", ""])(
    "refuses the base path %j",
    (basePath) => {
      expect(() => sessionRoutes(basePath)).toThrow(TypeError);
    },
  );

  it("names the six routes of the contract", () => {
    expect(Object.values(SESSION_ROUTES)).toEqual(["sign-in", "sign-up", "callback", "session", "sign-out", "switch-organization"]);
  });
});

describe("safeReturnTo", () => {
  it.each([
    ["/invoices", "/invoices"],
    ["/invoices?status=due#latest", "/invoices?status=due#latest"],
    ["/", "/"],
    ["https://app.brightleaffoods.in/reports/q3", "/reports/q3"],
    ["/a/../reports", "/reports"],
    ["/%2F%2Fevil.example", "/%2F%2Fevil.example"],
    ["/réception", "/r%C3%A9ception"],
  ])("keeps %j as %j", (value, expected) => {
    expect(safeReturnTo(value, origin)).toBe(expected);
  });

  it.each([
    ["another origin", "https://evil.example/"],
    ["another scheme on the same host", "http://app.brightleaffoods.in/"],
    ["another port", "https://app.brightleaffoods.in:8443/"],
    ["a protocol-relative URL", "//evil.example/"],
    ["a backslash", "/\\evil.example"],
    ["a backslash anywhere", "/invoices\\..\\x"],
    ["a dot segment that becomes //", "/.//evil.example"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,hi"],
    ["credentials", "https://meera:secret@app.brightleaffoods.in/"],
    ["a control character", "/invoices\n"],
    ["a tab", "/in\tvoices"],
    ["an empty string", ""],
    ["something too long", `/${"a".repeat(MAX_RETURN_TO_LENGTH)}`],
    ["a number", 42],
    ["undefined", undefined],
  ])("refuses %s", (_label, value) => {
    expect(safeReturnTo(value, origin)).toBeUndefined();
  });

  it("refuses everything when the origin itself is not a URL", () => {
    expect(safeReturnTo("/invoices", "not a url")).toBeUndefined();
  });
});

describe("parseSession", () => {
  it("returns a session that fits, frozen", () => {
    const parsed = parseSession(JSON.parse(JSON.stringify(meera)));
    expect(parsed).toEqual(meera);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.user)).toBe(true);
    expect(Object.isFrozen(parsed.roles)).toBe(true);
  });

  it("keeps nulls and empty lists", () => {
    expect(parseSession(arjun)).toEqual(arjun);
    expect(parseSession({ ...meera, organization: null }).organization).toBeNull();
  });

  it("fills a missing nullable field and drops fields it doesn't know", () => {
    const parsed = parseSession({
      user: { id: meera.user.id, locale: "en-IN" },
      organization: { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f" },
      expiresAt: meera.expiresAt,
      accessToken: "eyJ…",
    });
    expect(parsed).toEqual({
      user: { id: meera.user.id, email: null, emailVerified: false, name: null, picture: null },
      organization: { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: null },
      roles: [],
      permissions: [],
      expiresAt: meera.expiresAt,
    });
    expect(parsed).not.toHaveProperty("accessToken");
  });

  it.each([
    ["not an object", "signed in", "session must be an object."],
    ["no user", { ...meera, user: undefined }, "session.user must be an object."],
    ["an empty user id", { ...meera, user: { ...meera.user, id: "" } }, "session.user.id must be a non-empty string."],
    ["a numeric email", { ...meera, user: { ...meera.user, email: 1 } }, "session.user.email must be a string or null."],
    [
      "a string emailVerified",
      { ...meera, user: { ...meera.user, emailVerified: "yes" } },
      "session.user.emailVerified must be a boolean.",
    ],
    [
      "an organisation without an id",
      { ...meera, organization: { name: "Brightleaf Foods" } },
      "session.organization.id must be a non-empty string.",
    ],
    ["an organisation that is a string", { ...meera, organization: "Brightleaf Foods" }, "session.organization must be an object."],
    ["roles that are not strings", { ...meera, roles: [1] }, "session.roles must be an array of strings."],
    ["permissions that are a string", { ...meera, permissions: "invoice.read" }, "session.permissions must be an array of strings."],
    ["no expiry", { ...meera, expiresAt: undefined }, "session.expiresAt must be an ISO 8601 date-time."],
    ["an expiry that isn't a date", { ...meera, expiresAt: "tomorrow" }, "session.expiresAt must be an ISO 8601 date-time."],
  ])("refuses %s", (_label, value, message) => {
    expect(() => parseSession(value)).toThrow(new TypeError(message));
  });
});

describe("the contract's constants", () => {
  it("names the CSRF header, the sign-in parameters and the callback's error parameter", () => {
    expect(CSRF_HEADER).toBe("X-Qeet-ID-Request");
    expect(CSRF_HEADER_VALUE).toBe("1");
    expect(SIGN_IN_PARAMETERS).toEqual({ returnTo: "returnTo", organization: "organization", loginHint: "loginHint" });
    expect(AUTH_ERROR_PARAMETER).toBe("authError");
  });

  it("is safe to import on a server: no React and no client directive", () => {
    const source = readFileSync(new URL("../src/contract.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from "react/);
    expect(source).not.toMatch(/^["']use client["']/m);
  });
});

describe("the contract's types", () => {
  it("describes the session from the ID token, userinfo and the management API", () => {
    expectTypeOf<SessionUser>().toEqualTypeOf<{
      readonly id: string;
      readonly email: string | null;
      readonly emailVerified: boolean;
      readonly name: string | null;
      readonly picture: string | null;
    }>();
    expectTypeOf<SessionOrganization>().toEqualTypeOf<{ readonly id: string; readonly name: string | null }>();
    expectTypeOf<Session>().toEqualTypeOf<{
      readonly user: SessionUser;
      readonly organization: SessionOrganization | null;
      readonly roles: readonly string[];
      readonly permissions: readonly string[];
      readonly expiresAt: string;
    }>();
    expectTypeOf<SessionResponse>().toEqualTypeOf<{ readonly session: Session | null }>();
  });

  it("never lets a session carry a token", () => {
    const withToken: Session = {
      ...meera,
      // @ts-expect-error a session has no place for a token
      accessToken: "eyJ…",
    };
    expect(withToken).toBeDefined();
  });

  it("types the requests and answers of the POST routes", () => {
    expectTypeOf<SignOutRequest>().toEqualTypeOf<{ readonly returnTo?: string }>();
    expectTypeOf<SignOutResponse>().toEqualTypeOf<{ readonly redirectTo: string }>();
    expectTypeOf<SwitchOrganizationRequest>().toEqualTypeOf<{ readonly organizationId: string }>();
    expectTypeOf<SwitchOrganizationResponse>().toEqualTypeOf<{ readonly session: Session }>();
    // @ts-expect-error the organisation is required
    const missing: SwitchOrganizationRequest = {};
    expect(missing).toBeDefined();
  });

  it("types the error envelope and the route names", () => {
    const answer: ErrorResponse = { error: { code: "csrf_rejected", message: "This request must come from the app's own pages." } };
    const newer: ErrorResponse = { error: { code: "a_code_from_a_newer_server", message: "…" } };
    expect([answer, newer]).toHaveLength(2);
    expectTypeOf<"organization_switch_unavailable">().toExtend<SessionErrorCode>();
    expectTypeOf<SessionRouteName>().toEqualTypeOf<"signIn" | "signUp" | "callback" | "session" | "signOut" | "switchOrganization">();
  });
});
