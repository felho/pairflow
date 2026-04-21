import { describe, expect, it } from "vitest";

import { resolveMergeCommandDependencies } from "../../../../src/v11/application/merge/mergeCommandDependencyResolution.js";

describe("mergeCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides", async () => {
    const customRunGit = (async () =>
      ({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })) as never;
    const executeRemoteBubbleMergeCommand = (async () => ({
      bubbleId: "b_remote_merge_01",
      baseBranch: "main",
      bubbleBranch: "bubble/b_remote_merge_01",
      mergeCommitSha: "abcdef123456",
      importSource: {
        kind: "git_ref" as const,
        ref: "refs/pairflow/import/b_remote_merge_01",
        commitSha: "abcdef123456"
      },
      cleanupPending: true
    })) as never;

    const resolved = await resolveMergeCommandDependencies({
      runGit: customRunGit,
      executeRemoteBubbleMergeCommand
    });

    expect(resolved.runGit).toBe(customRunGit);
    expect(resolved.executeRemoteBubbleMergeCommand).toBe(
      executeRemoteBubbleMergeCommand
    );
  });
});
