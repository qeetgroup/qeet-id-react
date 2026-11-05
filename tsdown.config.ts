import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

// ES module and CommonJS builds with matching declarations, one file per
// source module: each module keeps its own "use client" directive, and
// bundlers drop what an app doesn't import.
export default defineConfig({
  entry: ["src/index.ts", "src/contract.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  target: "es2022",
  unbundle: true,
  fixedExtension: true,
  dts: true,
  sourcemap: false,
  clean: true,
  // The optional stylesheet ships as written, beside the modules; nothing imports it.
  copy: ["src/styles.css"],
  // VERSION comes from package.json, the one place a release changes it.
  define: { __QEET_ID_SDK_VERSION__: JSON.stringify(version) },
  inputOptions: {
    // Rolldown warns that a module-level "use client" may not survive bundling.
    // Unbundled output keeps every module's directive.
    onLog(level, log, handler) {
      if (log.code === "MODULE_LEVEL_DIRECTIVE" && log.message.includes('"use client"')) return;
      handler(level, log);
    },
  },
});
