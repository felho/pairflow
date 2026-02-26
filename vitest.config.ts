import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/metricsEnv.ts"],
    include: ["tests/**/*.test.ts"]
  }
});
