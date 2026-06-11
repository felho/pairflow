/**
 * Test files that must keep per-file process isolation.
 *
 * The main vitest project runs with `isolate: false` so the heavy defaults
 * import graph is evaluated once per worker instead of once per test file.
 * Files that replace modules (vi.mock / vi.doMock / vi.doUnmock) or reset the
 * module registry (vi.resetModules) cannot share a module registry with other
 * files: the mock silently fails to apply when another file already loaded
 * the real module in the same worker, and applied mocks or registry resets
 * leak into files that run afterwards.
 *
 * Every test file using those APIs must be listed here; the guard test in
 * tests/config/isolationQuarantine.test.ts enforces this.
 */
export const isolatedTestFiles = [
  "tests/cli/bubbleDeleteCommand.test.ts",
  "tests/cli/bubbleDeleteExitCode.integration.test.ts",
  "tests/cli/bubbleKickoffDeliveryWarning.test.ts",
  "tests/cli/convergedDeliveryWarning.test.ts",
  "tests/cli/passAutoConvergeWarning.test.ts",
  "tests/cli/requestReworkDeliveryWarning.test.ts",
  "tests/core/archive/archiveLocking.test.ts",
  "tests/core/bubble/deleteBubble.removeBubbleDirectory.test.ts",
  "tests/core/bubble/startBubble.test.ts",
  "tests/core/runtime/tmuxManager.test.ts",
  "tests/core/ui/router.test.ts",
  "tests/core/util/pathExists.test.ts",
  "tests/core/workspace/worktreeManager.test.ts",
  "tests/v11/application/commit/commitCommandPipeline.test.ts",
  "tests/v11/application/create/createRepoDefaultsRuntimeIsolation.test.ts",
  "tests/v11/application/pass/passFlowDependencyWiring.test.ts",
  "tests/v11/infrastructure/foundation/fs/pathExists.test.ts"
];
