import { describe, expect, it } from "vitest";

import { runPassValidationCommand } from "../../../src/core/runtime/passValidationRunner.js";

describe("runPassValidationCommand pre-header error", () => {
  it("fails before spawn when log bootstrap cannot be written", async () => {
    await expect(
      runPassValidationCommand(
        {
          kind: "lint",
          command: "pnpm lint",
          worktreePath: "/tmp/worktree"
        },
        {
          open: async () => {
            throw new Error("open failed");
          }
        }
      )
    ).rejects.toMatchObject({
      name: "PassValidationRunnerExecutionError",
      stage: "pre_header",
      kind: "lint",
      logPath: ".pairflow/evidence/pass-validation-lint.log"
    });
  });
});
