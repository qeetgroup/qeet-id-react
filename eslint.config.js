import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "examples/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
