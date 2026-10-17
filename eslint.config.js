import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // dist is build output; src/components/ui is auto-generated shadcn/ui
    // (AGENTS.md: "do not edit") — fixing lint there would be overwritten on
    // the next generator run. .wrangler/.react-doctor/bun-cache are tooling dirs.
    ignores: [
      "dist",
      ".agent",
      ".lovable",
      ".wrangler",
      ".react-doctor",
      ".bun-cache",
      "worker-configuration.d.ts",
      "src/components/ui/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
