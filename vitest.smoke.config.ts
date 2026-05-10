import { defineConfig } from "vitest/config";

import { rootUiContractAlias } from "./vitest.config.js";

export default defineConfig({
  resolve: {
    alias: [rootUiContractAlias]
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/metricsEnv.ts"],
    include: ["tests/almostE2e/**/*.test.ts"],
    testTimeout: 300000
  }
});
