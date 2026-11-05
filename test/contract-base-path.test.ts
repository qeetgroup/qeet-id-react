import { describe, expect, it } from "vitest";
import { sessionRoutes } from "../src/contract";

describe("sessionRoutes base path", () => {
  it("ignores trailing slashes on the base path", () => {
    expect(sessionRoutes("/account/auth///").session).toBe("/account/auth/session");
  });

  it("stays fast on a long run of slashes that does not end the base path", () => {
    const hostile = `/a${"/".repeat(100_000)}b`;
    const started = performance.now();
    expect(sessionRoutes(hostile).session).toBe(`${hostile}/session`);
    expect(performance.now() - started).toBeLessThan(50);
  });
});
