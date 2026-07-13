import { defineConfig } from "vitest/config";

// PANES renderer tests: component tests need a DOM (jsdom) and the React
// automatic JSX runtime; pure sanitizer tests run in the same environment
// without issue. Setup wires @testing-library/jest-dom matchers.
export default defineConfig({
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
