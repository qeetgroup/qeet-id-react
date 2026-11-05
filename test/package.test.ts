// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "qeet-id-react-dist-"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** Every file under `dir`, relative to it. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path).map((file) => join(name, file)) : [name];
  });
}

const sources = files(join(root, "src")).filter((file) => /\.tsx?$/.test(file));
const clientSources = sources.filter((file) => /^["']use client["'];/.test(readFileSync(join(root, "src", file), "utf8")));
const built = (source: string, extension: ".mjs" | ".cjs") => readFileSync(join(out, source.replace(/\.tsx?$/, extension)), "utf8");
/** The module specifiers a built file imports or requires. */
const importsOf = (code: string) =>
  [...code.matchAll(/(?:^import [^"]*?|^export [^"]*? from |require\()"([^"]+)"/gm)].map((match) => match[1] as string);
/** Source without comments, so a mention in documentation doesn't count. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

beforeAll(() => {
  execFileSync(join(root, "node_modules/.bin/tsdown"), ["--out-dir", out, "--log-level", "error"], { cwd: root, stdio: "pipe" });
}, 60_000);

afterAll(() => {
  rmSync(out, { recursive: true, force: true });
});

describe("the source's client boundaries", () => {
  it("marks every module that uses hooks or context, and nothing else", () => {
    for (const file of sources) {
      const source = code(readFileSync(join(root, "src", file), "utf8"));
      const usesClientReact = /(?<![.\w])(use[A-Z]\w*|createContext)\(/.test(source.replace(/function use[A-Z]\w*\(/g, ""));
      expect({ file, client: clientSources.includes(file) }).toEqual({ file, client: usesClientReact });
    }
  });

  it("keeps the entries a Server Component imports free of the directive", () => {
    for (const file of ["index.ts", "contract.ts", "errors.ts", "version.ts", "testing.ts", "provider/localization.ts"]) {
      expect(clientSources).not.toContain(file);
    }
  });
});

describe("the build", () => {
  it('keeps every module\'s "use client" as its first statement, in both formats', () => {
    expect(clientSources.length).toBeGreaterThan(10);
    for (const source of clientSources) {
      expect(built(source, ".mjs").startsWith('"use client";')).toBe(true);
      expect(built(source, ".cjs").startsWith('"use client";')).toBe(true);
    }
  });

  it("adds the directive nowhere else", () => {
    for (const source of sources.filter((file) => !clientSources.includes(file))) {
      expect(built(source, ".mjs").startsWith('"use client"')).toBe(false);
      expect(code(built(source, ".mjs"))).not.toContain('"use client"');
    }
  });

  it("builds one file per module, so bundlers drop what an app doesn't import", () => {
    const modules = files(out).filter((file) => file.endsWith(".mjs"));
    expect(modules.sort()).toEqual(sources.map((file) => file.replace(/\.tsx?$/, ".mjs")).sort());
  });

  it("ships the stylesheet unchanged, and nothing imports it", () => {
    expect(readFileSync(join(out, "styles.css"), "utf8")).toBe(readFileSync(join(root, "src/styles.css"), "utf8"));
    for (const file of files(out).filter((name) => /\.[mc]js$/.test(name))) {
      expect(importsOf(readFileSync(join(out, file), "utf8")).filter((specifier) => specifier.endsWith(".css"))).toEqual([]);
    }
    expect(packageJson.sideEffects).toEqual(["**/*.css"]);
  });

  it("depends on nothing at runtime but React", () => {
    const imports = new Set<string>();
    for (const file of files(out).filter((name) => /\.[mc]js$/.test(name))) {
      for (const specifier of importsOf(readFileSync(join(out, file), "utf8"))) if (!specifier.startsWith(".")) imports.add(specifier);
    }
    expect([...imports].sort()).toEqual(["react", "react/jsx-runtime"]);
    expect(packageJson.dependencies).toBeUndefined();
    expect(Object.keys(packageJson.peerDependencies)).toEqual(["react"]);
  });

  it("puts the version from package.json in VERSION", async () => {
    const { VERSION } = await import(join(out, "version.mjs"));
    expect(VERSION).toBe(packageJson.version);
  });

  it("loads the contract without React, from ES modules and CommonJS", async () => {
    expect(importsOf(built("contract.ts", ".mjs"))).toEqual([]);
    expect(importsOf(built("contract.ts", ".cjs"))).toEqual([]);
    const esm = await import(join(out, "contract.mjs"));
    const cjs = createRequire(import.meta.url)(join(out, "contract.cjs"));
    for (const contract of [esm, cjs]) {
      expect(contract.sessionRoutes("/auth").session).toBe("/auth/session");
      expect(contract.safeReturnTo("//evil.example", "https://app.brightleaffoods.in")).toBeUndefined();
      expect(contract.CSRF_HEADER).toBe("X-Qeet-ID-Request");
    }
  });

  it("declares every entry's types", () => {
    for (const entry of ["index", "contract", "testing"]) {
      expect(files(out)).toContain(`${entry}.d.mts`);
      expect(files(out)).toContain(`${entry}.d.cts`);
    }
    expect(relative(root, out)).not.toBe("dist");
  });
});
