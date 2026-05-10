import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export const rootUiContractAlias = {
  find: "@pairflow/ui-contracts",
  replacement: fileURLToPath(new URL("./src/contracts/ui/index.ts", import.meta.url))
};

export default defineConfig({
  resolve: {
    alias: [rootUiContractAlias]
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/metricsEnv.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/almostE2e/**/*.test.ts"],
    testTimeout: 30000
  }
});
