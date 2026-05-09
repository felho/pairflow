import { describe, expect, it, vi } from "vitest";

import { createBubbleMergeError } from "../../../../src/v11/application/merge/mergeCommandErrorRuntime.js";
import { runMergeCommandPipeline } from "../../../../src/v11/application/merge/internal/pipeline/mergeCommandPipeline.js";
import type { ResolvedMergeCommandDependencies } from "../../../../src/v11/application/merge/mergeCommandDependencyResolution.js";
import type { RunMergeCommandPipelineInput } from "../../../../src/v11/application/merge/mergeCommandContract.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/shared/state/bubbleStateSnapshotTypes.js";

function buildPipelineInput(
  overrides: Partial<RunMergeCommandPipelineInput> = {}
): RunMergeCommandPipelineInput {
  return {
    bubbleId: "merge_pipeline",
    repoPath: "/repo",
    cwd: "/repo",
    push: false,
    deleteRemote: false,
    now: new Date("2026-05-09T10:00:00.000Z"),
    nowIso: "2026-05-09T10:00:00.000Z",
    createError: createBubbleMergeError,
    ...overrides
  };
}

function buildDoneState(): BubbleStateSnapshot {
  return {
    schema_version: "v11",
    state: "DONE",
    bubble_id: "merge_pipeline",
    round: 1,
    active_agent: null,
    active_role: null,
    active_since: null,
    last_command_at: "2026-05-09T09:00:00.000Z"
  } as unknown as BubbleStateSnapshot;
}

function buildDependencies(
  calls: string[],
  overrides: Record<string, unknown> = {}
): ResolvedMergeCommandDependencies {
  const runGit = vi.fn(async (args: string[]) => {
    calls.push(`git:${args.join(" ")}`);
    if (args[0] === "status") {
      return { stdout: "", stderr: "", exitCode: 0 };
    }
    if (args[0] === "remote") {
      return { stdout: "git@example.test/repo.git\n", stderr: "", exitCode: 0 };
    }
    if (args[0] === "rev-parse") {
      return { stdout: "merge-sha\n", stderr: "", exitCode: 0 };
    }
    return { stdout: "", stderr: "", exitCode: 0 };
  });

  return {
    runGit,
    resolveBubbleById: vi.fn(async () => ({
      bubbleId: "merge_pipeline",
      repoPath: "/repo",
      bubbleConfig: {
        base_branch: "main",
        bubble_branch: "bubble/merge_pipeline"
      },
      bubblePaths: {
        statePath: "/repo/.pairflow/bubbles/merge_pipeline/state.json",
        transcriptPath: "/repo/.pairflow/bubbles/merge_pipeline/transcript.jsonl",
        sessionsPath: "/repo/.pairflow/sessions.json",
        worktreePath: "/repo/.pairflow/worktrees/merge_pipeline",
        remotePointerPath: "/repo/.pairflow/bubbles/merge_pipeline/remote.json"
      }
    })),
    readStateSnapshot: vi.fn(async () => ({
      state: buildDoneState(),
      fingerprint: "state-fingerprint"
    })),
    writeStateSnapshot: vi.fn(async () => {
      calls.push("state:write");
    }),
    branchExists: vi.fn(async () => true),
    terminateBubbleTmuxSession: vi.fn(async () => {
      calls.push("cleanup:tmux");
      return { sessionName: "pairflow-merge_pipeline", existed: false };
    }),
    removeRuntimeSession: vi.fn(async () => {
      calls.push("cleanup:runtime");
      return true;
    }),
    cleanupWorktreeWorkspace: vi.fn(async () => {
      calls.push("cleanup:worktree");
      return { removedWorktree: true, removedBranch: true };
    }),
    ensureBubbleInstanceIdForMutation: vi.fn(async (
      input: { bubbleConfig: unknown }
    ) => ({
      bubbleInstanceId: "inst_merge_pipeline",
      bubbleConfig: input.bubbleConfig
    })),
    emitBubbleLifecycleEventBestEffort: vi.fn(async () => {
      calls.push("event:merged");
    }),
    readRemotePointer: vi.fn(async () => null),
    resolveRemoteBubbleStatusTarget: vi.fn(),
    executeRemoteBubbleMergeCommand: vi.fn(),
    executeRemoteBubbleMergeCleanupCommand: vi.fn(),
    importRemoteBubbleCommitContinuity: vi.fn(),
    renamePath: vi.fn(),
    writeTextFile: vi.fn(),
    ...overrides
  } as unknown as ResolvedMergeCommandDependencies;
}

describe("runMergeCommandPipeline", () => {
  it("runs the local merge, publication, cleanup, and result mapping in order", async () => {
    const calls: string[] = [];
    const dependencies = buildDependencies(calls);

    const result = await runMergeCommandPipeline(
      buildPipelineInput({ push: true }),
      dependencies
    );

    expect(result).toMatchObject({
      bubbleId: "merge_pipeline",
      baseBranch: "main",
      bubbleBranch: "bubble/merge_pipeline",
      mergeCommitSha: "merge-sha",
      presentationRoute: "local",
      pushedBaseBranch: true,
      deletedRemoteBranch: false,
      removedWorktree: true,
      removedBubbleBranch: true
    });
    expect(calls).toEqual([
      "git:status --porcelain",
      "git:checkout main",
      "git:merge --no-ff --no-edit bubble/merge_pipeline",
      "git:rev-parse HEAD",
      "git:remote get-url origin",
      "git:push origin main",
      "cleanup:tmux",
      "cleanup:runtime",
      "state:write",
      "cleanup:worktree",
      "event:merged"
    ]);
  });

  it("rejects started-remote publication flags before executing remote merge", async () => {
    const calls: string[] = [];
    const executeRemoteBubbleMergeCommand = vi.fn();
    const dependencies = buildDependencies(calls, {
      readRemotePointer: vi.fn(async () => ({
        kind: "started",
        host: "ssh.example.test",
        instanceId: "remote-instance",
        remoteClonePath: "/remote/repo",
        tmuxSession: "pairflow-remote",
        startedAt: "2026-05-09T09:30:00.000Z"
      })),
      resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
        alias: "prod",
        host: "ssh.example.test",
        pairflowCommand: "pairflow"
      })),
      executeRemoteBubbleMergeCommand
    });
    (dependencies as { resolveBubbleById: unknown }).resolveBubbleById = vi.fn(async () => ({
      bubbleId: "merge_pipeline",
      repoPath: "/repo",
      bubbleConfig: {
        base_branch: "main",
        bubble_branch: "bubble/merge_pipeline",
        executor: {
          type: "ssh",
          remote: "prod"
        }
      },
      bubblePaths: {
        statePath: "/repo/.pairflow/bubbles/merge_pipeline/state.json",
        transcriptPath: "/repo/.pairflow/bubbles/merge_pipeline/transcript.jsonl",
        sessionsPath: "/repo/.pairflow/sessions.json",
        worktreePath: "/repo/.pairflow/worktrees/merge_pipeline",
        remotePointerPath: "/repo/.pairflow/bubbles/merge_pipeline/remote.json"
      }
    }));

    await expect(
      runMergeCommandPipeline(
        buildPipelineInput({ push: true }),
        dependencies
      )
    ).rejects.toMatchObject({
      reasonCode: "MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED"
    });
    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
    expect(calls).toEqual(["git:status --porcelain"]);
  });
});
