import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      OPENAI_API_KEY: "sk-test-placeholder",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/validators.ts", "lib/auth/**", "lib/payment/**", "lib/agents/**", "lib/x402/**"],
      exclude: ["**/index.ts"],
      thresholds: { branches: 70, functions: 80, lines: 80 },
    },
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
