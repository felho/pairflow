import { defineConfig } from "vitest/config";

// Mutation-run vitest profile (StrykerJS): identical to vitest.config.ts
// except the subprocess-spawning CLI smoke tests are excluded — they exec
// the repo-root tsx bin, which does not exist inside Stryker's sandbox copy.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "src/cli/cli.test.ts", "src/cli/dev/dev.test.ts"],
  },
});
