// Flat ESLint config shared by every workspace package (ESLint 9).
// Kept intentionally light for Phase 0: type-aware linting and per-package
// overrides are added by the owning agents as their surfaces land.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/out/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "**/*.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
