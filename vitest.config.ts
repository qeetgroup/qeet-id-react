import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/** A package installed for the React 18 run (test/react-18, `bun run test:react-18`). */
const react18 = (name: string): string => fileURLToPath(new URL(`./test/react-18/node_modules/${name}`, import.meta.url));

export default defineConfig({
  // The same build-time VERSION as tsdown.config.ts.
  define: { __QEET_ID_SDK_VERSION__: JSON.stringify(version) },
  test: {
    environment: "jsdom",
    // The app's origin in every browser test; return paths are read from it.
    environmentOptions: { jsdom: { url: "https://app.brightleaffoods.in/invoices?status=due" } },
    setupFiles: ["test/setup.ts"],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
    },
    projects: [
      {
        extends: true,
        test: { name: "react-19", include: ["test/**/*.test.{ts,tsx}"], env: { REACT_MAJOR: "19" } },
      },
      {
        // Every test that renders, again on React 18.3. The aliases send the
        // SDK's own imports to React 18; Testing Library and react-dom, loaded
        // from test/react-18, find React 18 next to them.
        extends: true,
        test: { name: "react-18", include: ["test/**/*.test.tsx"], env: { REACT_MAJOR: "18" } },
        resolve: {
          alias: [
            { find: /^react$/, replacement: react18("react") },
            { find: /^react\/(.*)$/, replacement: react18("react/$1") },
            { find: /^react-dom$/, replacement: react18("react-dom") },
            { find: /^react-dom\/(.*)$/, replacement: react18("react-dom/$1") },
            { find: /^@testing-library\/react$/, replacement: react18("@testing-library/react") },
          ],
        },
      },
    ],
  },
});
