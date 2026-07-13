import { defineConfig } from "vitest/config";

/**
 * Vitest config for @hermes/web (COURIER-added, minimal).
 *
 * The app source uses React's automatic JSX runtime (no `import React`), matching
 * Next's transform. Vitest's esbuild otherwise defaults to the classic runtime and
 * fails component render tests with "React is not defined", so we pin the automatic
 * runtime here. This only affects how JSX in tests/components is transformed; the
 * pure `.test.ts` suites are unaffected. If ATLAS later owns a shared test config,
 * this collapses into it.
 */
export default defineConfig({
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
});
