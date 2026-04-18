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
      pushedBaseBranch: true,
      deletedRemoteBranch: false,
      tmuxSessionName: "pf-b_remote_merge_01",
      tmuxSessionExisted: true,
      runtimeSessionRemoved: true,
      removedWorktree: true,
      removedBubbleBranch: true
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
