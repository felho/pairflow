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
      // packet ch9-p4a (T1): the new subprocess/tmux test files — real /bin/sh
      // and git children (gate runner), real node children (direct channel),
      // real tmux sessions (tmux channel) — the same declared subprocess
      // blind class; the pure TX7 rows stay Stryker-covered in
      // actorAdapterClassify.test.ts.
      "src/runner/processGateRunner.test.ts",
      "src/runner/spawnChannel.test.ts",
      "src/runner/tmuxChannel.test.ts",
      // packet ch9-p4b (T1): the operator-surface test files — the unit suite
      // drives real child processes where the lane demands them (the
      // liveness/exec seams), and the journeys exec the repo-root tsx bin +
      // real tmux + git; the same declared subprocess blind class, so mutation
      // coverage for this packet's subprocess lanes is PARTIAL by the profile's
      // own mechanism.
      "src/cli/runnerCli.test.ts",
      "src/cli/runnerJourney.test.ts",
      // packet ch13-p0: the closed-pipe SUBPROCESS lanes (families 5–6, family
      // 7's binding members, family 4's process-level member) exec the
      // repo-root tsx bin — the same declared subprocess blind class. The
      // packet's in-process SEAM lanes deliberately stay IN the profile
      // (`src/cli/closedPipeSink.test.ts`), because the new branching logic in
      // `cli/common.ts` is exactly what the mutation pilot must see.
      "src/cli/closedPipe.test.ts",
    ],
  },
});
