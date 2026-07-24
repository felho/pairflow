import { defineConfig } from "vitest/config";

// Mutation-run vitest profile (StrykerJS): identical to vitest.config.ts
// except the subprocess-spawning CLI smoke tests are excluded — they exec
// the repo-root tsx bin, which does not exist inside Stryker's sandbox copy.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "src/cli/cli.test.ts",
      "src/cli/dev/dev.test.ts",
      "src/cli/journey.test.ts",
      "src/cli/worktreeJourney.test.ts",
      // packet ch9-p3b (T3): the real-spawn test files exec repo-external bins
      // (node + the wrapper asset), which Stryker's sandbox copy cannot resolve
      // — the logged subprocess blind class. Mutation coverage for this packet
      // is therefore PARTIAL by the profile's own declared mechanism.
      "src/runner/spawn.test.ts",
      "src/runner/actorAdapter.test.ts",
      "src/ctBRealRunner.test.ts",
    ],
  },
});
