import { describe, expect, it } from "vitest";

import { resolveMergeCommandDependencies } from "../../../../src/v11/application/merge/mergeCommandDependencyResolution.js";
import { mergeBubbleDependencyDefaults } from "../../../../src/v11/defaults/merge/mergeCommandDefaults.js";

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
    const executeRemoteBubbleMergeCleanupCommand = (async () => ({
      bubbleId: "b_remote_merge_01",
      baseBranch: "main",
      bubbleBranch: "bubble/b_remote_merge_01",
      artifacts: {
        worktree: {
          path: "/remote/repo",
          existed: true
        },
        tmux: {
          sessionName: "pf-b_remote_merge_01",
          existed: true
        },
        runtimeSession: {
          path: "/remote/repo/.pairflow/runtime/sessions.json",
          existed: true
        },
        branch: {
          name: "bubble/b_remote_merge_01",
          existed: true
        }
      },
      tmuxSessionTerminated: true,
      runtimeSessionRemoved: true,
      removedWorktree: true,
      removedBubbleBranch: true,
      tmuxSessionName: "pf-b_remote_merge_01"
    })) as never;

    const resolved = resolveMergeCommandDependencies(
      {
        runGit: customRunGit,
        executeRemoteBubbleMergeCommand,
        executeRemoteBubbleMergeCleanupCommand
      },
      mergeBubbleDependencyDefaults
    );

    expect(resolved.runGit).toBe(customRunGit);
    expect(resolved.executeRemoteBubbleMergeCommand).toBe(
      executeRemoteBubbleMergeCommand
    );
    expect(resolved.executeRemoteBubbleMergeCleanupCommand).toBe(
      executeRemoteBubbleMergeCleanupCommand
    );
  });
});
