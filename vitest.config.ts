import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: ["**/*.d.ts"],
      reporter: ["text-summary", "json-summary"],
      // Baseline from docs/REFACTOR-PLAN.md Phase 0; raise as coverage grows, never lower.
      thresholds: { statements: 48, branches: 37, functions: 52, lines: 50 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
