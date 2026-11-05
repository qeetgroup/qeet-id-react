import { afterEach, describe, expect, it, vi } from "vitest";
import { assignLocation, isHttpOrPath, returnPath, signInUrl } from "../src/core/navigation";

describe("isHttpOrPath", () => {
  it.each([
    ["/invoices", true],
    ["https://id.qeet.in/v1/oauth/logout", true],
    ["http://localhost:3000/", true],
    ["invoices", true],
    ["javascript:alert(1)", false],
    ["JAVASCRIPT:alert(1)", false],
    ["data:text/html,hi", false],
    ["mailto:meera@brightleaffoods.in", false],
    ["", false],
    ["http://[::1", false],
  ])("%j is %s", (value, expected) => {
    expect(isHttpOrPath(value)).toBe(expected);
  });
});

describe("assignLocation", () => {
  it("refuses a URL that could run script", () => {
    expect(() => assignLocation("javascript:alert(1)")).toThrow(
      new TypeError('Refusing to navigate to "javascript:alert(1)": not an http(s) URL or a path.'),
    );
  });
});

describe("returnPath", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/invoices?status=due");
  });

  it("is the current page by default, with its query and fragment", () => {
    window.history.replaceState(null, "", "/reports/q3?region=south#totals");
    expect(returnPath(undefined)).toBe("/reports/q3?region=south#totals");
  });

  it("keeps a path on this site and replaces one elsewhere", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(returnPath("/settings")).toBe("/settings");
    expect(returnPath("https://app.brightleaffoods.in/settings")).toBe("/settings");
    expect(returnPath("https://evil.example/settings")).toBe("/invoices?status=due");
  });
});

describe("signInUrl", () => {
  it("adds only the parameters given", () => {
    expect(signInUrl("/auth/sign-in", { returnTo: "/" })).toBe("/auth/sign-in?returnTo=%2F");
    expect(signInUrl("/auth/sign-in", { returnTo: "/", organization: "", loginHint: "" })).toBe("/auth/sign-in?returnTo=%2F");
  });
});
