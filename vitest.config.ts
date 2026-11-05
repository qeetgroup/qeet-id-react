import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  // The same build-time VERSION as tsdown.config.ts.
  define: { __QEET_ID_SDK_VERSION__: JSON.stringify(version) },
  test: {
    environment: "jsdom",
    // The app's origin in every browser test; return paths are read from it.
    environmentOptions: { jsdom: { url: "https://app.brightleaffoods.in/invoices?status=due" } },
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
