import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { isolatedTestFiles } from "./vitest.isolation.js";

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
    testTimeout: 30000,
    // Vitest creates one pool per pool type and reads `isolate` from the
    // root config only, so isolation is steered per project via the pool:
    // the forks pool shares each worker's module registry (fast), while the
    // threads pool keeps the default per-file isolation for the quarantine.
    poolOptions: {
      forks: {
        isolate: false
      }
    },
    // include/exclude live on the projects only: `extends: true` merges
    // arrays, so inherited root globs would leak into both projects.
    projects: [
      {
        extends: true,
        test: {
          name: "main",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/almostE2e/**/*.test.ts", ...isolatedTestFiles]
        }
      },
      {
        extends: true,
        test: {
          name: "isolated",
          include: isolatedTestFiles,
          pool: "threads"
        }
      }
    ]
  }
});
