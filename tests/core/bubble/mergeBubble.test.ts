import { mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import {
  BubbleMergeErrorV11 as BubbleMergeError,
  mergeBubbleV11 as mergeBubbleApplication
} from "../../../src/v11/application/merge/emitMergeV11.js";
import type {
  MergeBubbleDependencies,
  MergeBubbleInput
} from "../../../src/v11/application/merge/mergeCommandContract.js";
import { mergeBubbleDependencyDefaults } from "../../../src/v11/defaults/merge/mergeCommandDefaults.js";
import {
  remoteMergeModeEnvVar,
  remoteMergeModeInnerRemoteExecution,
  remoteMergeWorkspaceRootEnvVar
} from "../../../src/v11/application/merge/remoteMergeExecutionContext.js";
import { RemoteBubbleMergeCommandError } from "../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { GitCommandError } from "../../../src/v11/infrastructure/workspace/git.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";

const tempDirs: string[] = [];

function mergeBubble(
  input: MergeBubbleInput,
  dependencies: MergeBubbleDependencies = {}
) {
  return mergeBubbleApplication(input, {
    ...mergeBubbleDependencyDefaults,
    ...dependencies
  });
}

async function createTempPath(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function createTempRepo(): Promise<string> {
  const repoPath = await createTempPath("pairflow-merge-bubble-");
  await initGitRepository(repoPath);
  return repoPath;
}

async function setupDoneBubble(repoPath: string, bubbleId: string) {
  const bubble = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Merge bubble test task",
    cwd: repoPath
  });

  await bootstrapWorktreeWorkspace({
    repoPath,
    baseBranch: "main",
    bubbleBranch: bubble.config.bubble_branch,
    worktreePath: bubble.paths.worktreePath,
    workspaceKind: "worktree"
  });

  await writeFile(
    join(bubble.paths.worktreePath, "feature.txt"),
    `${bubbleId}\n`,
    "utf8"
  );
  await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
  await runGit(bubble.paths.worktreePath, ["commit", "-m", `feat(${bubbleId}): change`]);

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "DONE",
      active_agent: null,
      active_role: null,
      active_since: null,
      last_command_at: "2026-02-23T10:00:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function convertDoneBubbleToClone(
  repoPath: string,
  bubble: Awaited<ReturnType<typeof setupDoneBubble>>
) {
  await writeFile(
    bubble.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...bubble.config,
      work_mode: "clone"
    }),
    "utf8"
  );
  await runGit(repoPath, ["worktree", "remove", "--force", bubble.paths.worktreePath]);
  await runGit(repoPath, ["clone", repoPath, bubble.paths.worktreePath]);
  await runGit(bubble.paths.worktreePath, ["config", "user.email", "pairflow@example.test"]);
  await runGit(bubble.paths.worktreePath, ["config", "user.name", "Pairflow Test"]);
  await runGit(bubble.paths.worktreePath, ["checkout", bubble.config.bubble_branch]);
  return bubble;
}

async function convertDoneBubbleToRemoteStarted(
  bubble: Awaited<ReturnType<typeof setupDoneBubble>>
) {
  await writeFile(
    bubble.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...bubble.config,
      executor: {
        type: "ssh",
        remote: "prod"
      }
    }),
    "utf8"
  );
  await writeFile(
    bubble.paths.remotePointerPath,
    JSON.stringify(
      {
        kind: "started",
        host: "ssh.example.com",
        instanceId: `inst_${bubble.bubbleId}`,
        remoteClonePath: `/srv/pairflow/repo--${bubble.bubbleId}`,
        tmuxSession: `pf-${bubble.bubbleId}`,
        startedAt: "2026-04-18T08:00:00.000Z"
      },
      null,
      2
    ),
    "utf8"
  );
  return bubble;
}

async function convertDoneBubbleToRemoteCreated(
  bubble: Awaited<ReturnType<typeof setupDoneBubble>>
) {
  await writeFile(
    bubble.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...bubble.config,
      executor: {
        type: "ssh",
        remote: "prod"
      }
    }),
    "utf8"
  );
  await writeFile(
    bubble.paths.remotePointerPath,
    JSON.stringify(
      {
        kind: "created",
        host: "ssh.example.com"
      },
      null,
      2
    ),
    "utf8"
  );
  return bubble;
}

function buildRemoteMergeHandoffResult(
  bubble: Awaited<ReturnType<typeof setupDoneBubble>>,
  overrides: Partial<{
    baseBranch: string;
    bubbleBranch: string;
    mergeCommitSha: string;
    importSourceRef: string;
    importSourceCommitSha: string;
    tmuxSessionName: string;
  }> = {}
) {
  const mergeCommitSha = overrides.mergeCommitSha ?? "abcdef1234567890";
  return {
    bubbleId: bubble.bubbleId,
    baseBranch: overrides.baseBranch ?? "main",
    bubbleBranch: overrides.bubbleBranch ?? bubble.config.bubble_branch,
    mergeCommitSha,
    importSource: {
      kind: "git_ref" as const,
      ref: overrides.importSourceRef ?? `refs/pairflow/import/${bubble.bubbleId}`,
      commitSha: overrides.importSourceCommitSha ?? mergeCommitSha
    },
    cleanupPending: true as const,
    ...(overrides.tmuxSessionName !== undefined
      ? { tmuxSessionName: overrides.tmuxSessionName }
      : { tmuxSessionName: `pf-${bubble.bubbleId}` })
  };
}

function buildRemoteMergeCleanupResult(
  bubble: Awaited<ReturnType<typeof setupDoneBubble>>,
  overrides: Partial<{
    baseBranch: string;
    bubbleBranch: string;
    remoteClonePath: string;
    tmuxSessionName: string;
    tmuxSessionExisted: boolean;
    tmuxSessionTerminated: boolean;
    runtimeSessionExisted: boolean;
    runtimeSessionRemoved: boolean;
    branchExisted: boolean;
    removedWorktree: boolean;
    removedBubbleBranch: boolean;
  }> = {}
) {
  const remoteClonePath =
    overrides.remoteClonePath ?? `/srv/pairflow/repo--${bubble.bubbleId}`;
  const tmuxSessionName = overrides.tmuxSessionName ?? `pf-${bubble.bubbleId}`;
  const tmuxSessionExisted = overrides.tmuxSessionExisted ?? true;
  const runtimeSessionExisted = overrides.runtimeSessionExisted ?? true;
  const branchExisted = overrides.branchExisted ?? true;

  return {
    bubbleId: bubble.bubbleId,
    baseBranch: overrides.baseBranch ?? "main",
    bubbleBranch: overrides.bubbleBranch ?? bubble.config.bubble_branch,
    artifacts: {
      worktree: {
        path: remoteClonePath,
        existed: true
      },
      tmux: {
        sessionName: tmuxSessionName,
        existed: tmuxSessionExisted
      },
      runtimeSession: {
        path: `${remoteClonePath}/.pairflow/runtime/sessions.json`,
        existed: runtimeSessionExisted
      },
      branch: {
        name: overrides.bubbleBranch ?? bubble.config.bubble_branch,
        existed: branchExisted
      }
    },
    tmuxSessionTerminated: overrides.tmuxSessionTerminated ?? tmuxSessionExisted,
    runtimeSessionRemoved:
      overrides.runtimeSessionRemoved ?? runtimeSessionExisted,
    removedWorktree: overrides.removedWorktree ?? true,
    removedBubbleBranch: overrides.removedBubbleBranch ?? branchExisted,
    tmuxSessionName
  };
}

function createRemoteRouteGitMock(input: {
  bubbleId: string;
  importedCommitSha?: string;
  mergedHeadSha?: string;
  fetchError?: Error;
  revParseError?: Error;
  mergeError?: Error;
  baseBranch?: string;
}) {
  const importedCommitSha = input.importedCommitSha ?? "abcdef1234567890";
  const mergedHeadSha = input.mergedHeadSha ?? "fedcba0987654321";
  const baseBranch = input.baseBranch ?? "main";

  return vi.fn(async (args: string[]) => {
    if (args[0] === "status") {
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    }
    if (args[0] === "fetch") {
      if (input.fetchError !== undefined) {
        throw input.fetchError;
      }
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    }
    if (
      args[0] === "rev-parse"
      && args[1] === `refs/pairflow/import/${input.bubbleId}^{commit}`
    ) {
      if (input.revParseError !== undefined) {
        throw input.revParseError;
      }
      return {
        stdout: `${importedCommitSha}\n`,
        stderr: "",
        exitCode: 0
      };
    }
    if (args[0] === "checkout" && args[1] === baseBranch) {
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    }
    if (
      args[0] === "merge"
      && args[1] === "--no-ff"
      && args[2] === "--no-edit"
      && args[3] === `refs/pairflow/import/${input.bubbleId}`
    ) {
      if (input.mergeError !== undefined) {
        throw input.mergeError;
      }
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    }
    if (args[0] === "merge" && args[1] === "--abort") {
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    }
    if (args[0] === "rev-parse" && args[1] === "HEAD") {
      return {
        stdout: `${mergedHeadSha}\n`,
        stderr: "",
        exitCode: 0
      };
    }
    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  });
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("mergeBubble", () => {
  it("merges DONE bubble branch into base and cleans runtime/worktree artifacts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupDoneBubble(repoPath, "b_merge_01");

    let terminateCalled = false;
    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T10:05:00.000Z")
      },
      {
        terminateBubbleTmuxSession: (input) => {
          terminateCalled = true;
          return Promise.resolve({
            sessionName: `pf-${input.bubbleId ?? "unknown"}`,
            existed: false
          });
        }
      }
    );

    expect(terminateCalled).toBe(true);
    expect(result.baseBranch).toBe("main");
    expect(result.bubbleBranch).toBe(bubble.config.bubble_branch);
    expect(result.presentationRoute).toBe("local");
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);
    expect(result.mergeCommitSha.length).toBeGreaterThan(6);

    const branch = (await runGit(repoPath, ["branch", "--show-current"])).stdout.trim();
    expect(branch).toBe("main");

    await expect(stat(bubble.paths.worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const featureContent = await runGit(repoPath, ["show", "HEAD:feature.txt"]);
    expect(featureContent.stdout.trim()).toBe("b_merge_01");

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("DONE");
    expect(state.state.last_command_at).toBe("2026-02-23T10:05:00.000Z");
  });

  it("rejects merge when bubble is not DONE", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_merge_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Merge bubble test task",
      cwd: repoPath
    });

    await expect(
      mergeBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(BubbleMergeError);
  });

  it("supports optional push + delete-remote cleanup flow", async () => {
    const repoPath = await createTempRepo();
    const remotePath = await createTempPath("pairflow-merge-remote-");
    await runGit(remotePath, ["init", "--bare"]);
    await runGit(repoPath, ["remote", "add", "origin", remotePath]);
    await runGit(repoPath, ["push", "-u", "origin", "main"]);

    const bubble = await setupDoneBubble(repoPath, "b_merge_03");
    await runGit(repoPath, ["push", "origin", bubble.config.bubble_branch]);

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        push: true,
        deleteRemote: true
      },
      {
        terminateBubbleTmuxSession: (input) =>
          Promise.resolve({
            sessionName: `pf-${input.bubbleId ?? "unknown"}`,
            existed: false
          })
      }
    );

    expect(result.pushedBaseBranch).toBe(true);
    expect(result.deletedRemoteBranch).toBe(true);
    expect(result.presentationRoute).toBe("local");

    const remoteBubble = await runGit(
      repoPath,
      ["ls-remote", "--heads", "origin", bubble.config.bubble_branch],
      true
    );
    expect(remoteBubble.stdout.trim()).toBe("");
  });

  it("merges clone-mode bubbles from the source repo branch and removes the owned clone workspace", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToClone(
      repoPath,
      await setupDoneBubble(repoPath, "b_merge_clone_01")
    );

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T10:10:00.000Z")
      },
      {
        terminateBubbleTmuxSession: (input) =>
          Promise.resolve({
            sessionName: `pf-${input.bubbleId ?? "unknown"}`,
            existed: false
          })
      }
    );

    expect(result.baseBranch).toBe("main");
    expect(result.bubbleBranch).toBe(bubble.config.bubble_branch);
    expect(result.presentationRoute).toBe("local");
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);

    await expect(stat(bubble.paths.worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const featureContent = await runGit(repoPath, ["show", "HEAD:feature.txt"]);
    expect(featureContent.stdout.trim()).toBe("b_merge_clone_01");
  });

  it("fails closed for clone-mode merge when the source repo bubble branch is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToClone(
      repoPath,
      await setupDoneBubble(repoPath, "b_merge_clone_missing_branch_01")
    );

    await runGit(repoPath, ["branch", "-D", bubble.config.bubble_branch]);

    await expect(
      mergeBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T10:11:00.000Z")
      })
    ).rejects.toBeInstanceOf(BubbleMergeError);

    const workspaceStats = await stat(bubble.paths.worktreePath);
    expect(workspaceStats.isDirectory()).toBe(true);
  });

  it("routes started remote merge through pre-cleanup handoff and local import/merge proof", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_started_01")
    );

    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble, {
        tmuxSessionName: `pf-handoff-${bubble.bubbleId}`
      })
    );
    const executeRemoteBubbleMergeCleanupCommand = vi.fn(async () =>
      buildRemoteMergeCleanupResult(bubble, {
        tmuxSessionName: `pf-cleanup-${bubble.bubbleId}`
      })
    );
    const emitBubbleLifecycleEventBestEffort = vi.fn(async () => undefined);
    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-04-18T08:05:00.000Z")
      },
      {
        runGit: runGitSpy,
        executeRemoteBubbleMergeCommand,
        executeRemoteBubbleMergeCleanupCommand,
        emitBubbleLifecycleEventBestEffort,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }))
      }
    );

    expect(executeRemoteBubbleMergeCommand).toHaveBeenCalledWith({
      bubbleId: bubble.bubbleId,
      remoteClonePath: `/srv/pairflow/repo--${bubble.bubbleId}`,
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      tmuxSessionName: `pf-${bubble.bubbleId}`
    });
    expect(executeRemoteBubbleMergeCleanupCommand).toHaveBeenCalledWith({
      bubbleId: bubble.bubbleId,
      remoteClonePath: `/srv/pairflow/repo--${bubble.bubbleId}`,
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      tmuxSessionName: `pf-${bubble.bubbleId}`
    });
    expect(runGitSpy).toHaveBeenCalled();
    expect(result).toMatchObject({
      bubbleId: bubble.bubbleId,
      mergeCommitSha: "fedcba0987654321",
      presentationRoute: "started_remote",
      pushedBaseBranch: false,
      removedWorktree: true,
      removedBubbleBranch: true,
      tmuxSessionName: `pf-cleanup-${bubble.bubbleId}`,
      tmuxSessionExisted: true,
      runtimeSessionRemoved: true
    });
    expect(runGitSpy).toHaveBeenCalledWith(
      [
        "merge",
        "--no-ff",
        "--no-edit",
        `refs/pairflow/import/${bubble.bubbleId}`
      ],
      expect.any(Object)
    );
    expect(emitBubbleLifecycleEventBestEffort).toHaveBeenCalledOnce();
    const firstEventCall =
      emitBubbleLifecycleEventBestEffort.mock.calls[0] as [unknown] | undefined;
    const eventInput = firstEventCall?.[0];
    expect(eventInput).toMatchObject({
      eventType: "bubble_merged",
      metadata: {
        route: "remote",
        tmux_session_existed: true,
        runtime_session_removed: true,
        removed_worktree: true,
        removed_bubble_branch: true
      }
    });

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.last_command_at).toBe("2026-04-18T08:05:00.000Z");
  });

  it("imports proven remote commit continuity before rejecting stale local state for started remote merge", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_import_state_01")
    );
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const staleState = {
      ...loaded.state,
      state: "APPROVED_FOR_COMMIT" as const,
      last_command_at: "2026-04-18T08:05:00.000Z"
    };
    const remoteDoneState = {
      ...loaded.state,
      state: "DONE" as const,
      last_command_at: "2026-04-18T08:06:00.000Z"
    };
    await writeStateSnapshot(bubble.paths.statePath, staleState, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "DONE"
    });

    const remoteEnvelope = {
      id: "msg_remote_merge_import_state_01",
      ts: "2026-04-18T08:06:00.000Z",
      bubble_id: bubble.bubbleId,
      sender: "orchestrator" as const,
      recipient: "human" as const,
      type: "COMMIT_RESULT" as const,
      round: remoteDoneState.round,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_merge_remote_import_state_01): finalize",
          commit_sha: "abcdef1234567890"
        }
      },
      refs: []
    };
    const importRemoteBubbleCommitContinuity = vi.fn(async () => ({
      classification: "imported_remote_completion" as const,
      bubbleId: bubble.bubbleId,
      sequence: 3,
      envelope: remoteEnvelope,
      state: remoteDoneState,
      stateContent: `${JSON.stringify(remoteDoneState, null, 2)}\n`,
      transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
      commitSha: "abcdef1234567890",
      commitMessage: "bubble(b_merge_remote_import_state_01): finalize",
      stagedFiles: ["feature.txt"]
    }));
    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );
    const executeRemoteBubbleMergeCleanupCommand = vi.fn(async () =>
      buildRemoteMergeCleanupResult(bubble)
    );
    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-04-18T08:07:00.000Z")
      },
      {
        runGit: runGitSpy,
        importRemoteBubbleCommitContinuity,
        executeRemoteBubbleMergeCommand,
        executeRemoteBubbleMergeCleanupCommand,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        })),
        writeTextFile: vi.fn(async (path: string, content: string) => {
          await writeFile(path, content, "utf8");
        })
      }
    );

    expect(importRemoteBubbleCommitContinuity).toHaveBeenCalledOnce();
    expect(executeRemoteBubbleMergeCommand).toHaveBeenCalledOnce();
    expect(result.presentationRoute).toBe("started_remote");
    expect((await readStateSnapshot(bubble.paths.statePath)).state.state).toBe("DONE");
  });

  it("checks dirty local source repo before importing stale remote commit continuity", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_dirty_import_01")
    );
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const staleState = {
      ...loaded.state,
      state: "APPROVED_FOR_COMMIT" as const,
      last_command_at: "2026-04-18T08:05:00.000Z"
    };
    await writeStateSnapshot(bubble.paths.statePath, staleState, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "DONE"
    });
    await writeFile(join(repoPath, "dirty.txt"), "dirty\n", "utf8");

    const importRemoteBubbleCommitContinuity = vi.fn(async () => {
      throw new Error("import must not run before dirty-tree guard");
    });
    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          importRemoteBubbleCommitContinuity,
          executeRemoteBubbleMergeCommand,
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REPO_DIRTY"
    } satisfies Partial<BubbleMergeError>);

    expect(importRemoteBubbleCommitContinuity).not.toHaveBeenCalled();
    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
    expect((await readStateSnapshot(bubble.paths.statePath)).state.state).toBe(
      "APPROVED_FOR_COMMIT"
    );
  });

  it("wraps unavailable remote commit continuity import with merge reason code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_import_unavailable_01")
    );
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "APPROVED_FOR_COMMIT",
        last_command_at: "2026-04-18T08:05:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "DONE"
      }
    );

    const importError = Object.assign(new Error("ssh unavailable"), {
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      context: {
        command_name: "commit",
        bubble_id: bubble.bubbleId
      }
    });
    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );

    let caught: unknown;
    try {
      await mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: createRemoteRouteGitMock({ bubbleId: bubble.bubbleId }),
          importRemoteBubbleCommitContinuity: vi.fn(async () => {
            throw importError;
          }),
          executeRemoteBubbleMergeCommand,
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_COMMIT_CONTINUITY_IMPORT_UNAVAILABLE",
      context: {
        command_name: "merge"
      }
    } satisfies Partial<BubbleMergeError>);
    expect((caught as Error | undefined)?.cause).toMatchObject({
      name: "Error",
      message: "ssh unavailable",
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      context: {
        command_name: "merge",
        bubble_id: bubble.bubbleId
      }
    });
    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
  });

  it("wraps invalid remote commit continuity import with merge reason code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_import_invalid_01")
    );
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "APPROVED_FOR_COMMIT",
        last_command_at: "2026-04-18T08:05:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "DONE"
      }
    );

    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: createRemoteRouteGitMock({ bubbleId: bubble.bubbleId }),
          importRemoteBubbleCommitContinuity: vi.fn(async () => {
            throw new Error("COMMIT_RESULT metadata mismatch");
          }),
          executeRemoteBubbleMergeCommand,
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID",
      context: {
        command_name: "merge",
        bubble_id: bubble.bubbleId
      }
    } satisfies Partial<BubbleMergeError>);

    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
  });

  it("fails closed when remote commit continuity import cannot sync local artifacts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_import_sync_fail_01")
    );
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const staleState = {
      ...loaded.state,
      state: "APPROVED_FOR_COMMIT" as const,
      last_command_at: "2026-04-18T08:05:00.000Z"
    };
    const remoteDoneState = {
      ...loaded.state,
      state: "DONE" as const,
      last_command_at: "2026-04-18T08:06:00.000Z"
    };
    await writeStateSnapshot(bubble.paths.statePath, staleState, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "DONE"
    });

    const remoteEnvelope = {
      id: "msg_remote_merge_import_sync_fail_01",
      ts: "2026-04-18T08:06:00.000Z",
      bubble_id: bubble.bubbleId,
      sender: "orchestrator" as const,
      recipient: "human" as const,
      type: "COMMIT_RESULT" as const,
      round: remoteDoneState.round,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_merge_remote_import_sync_fail_01): finalize",
          commit_sha: "abcdef1234567890"
        }
      },
      refs: []
    };
    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: createRemoteRouteGitMock({ bubbleId: bubble.bubbleId }),
          importRemoteBubbleCommitContinuity: vi.fn(async () => ({
            classification: "imported_remote_completion" as const,
            bubbleId: bubble.bubbleId,
            sequence: 3,
            envelope: remoteEnvelope,
            state: remoteDoneState,
            stateContent: `${JSON.stringify(remoteDoneState, null, 2)}\n`,
            transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
            commitSha: "abcdef1234567890",
            commitMessage: "bubble(b_merge_remote_import_sync_fail_01): finalize",
            stagedFiles: ["feature.txt"]
          })),
          executeRemoteBubbleMergeCommand,
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          writeTextFile: vi.fn(async () => {
            throw new Error("disk full");
          })
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_COMMIT_CONTINUITY_SYNC_BACK_FAILED",
      context: {
        command_name: "merge",
        bubble_id: bubble.bubbleId
      }
    } satisfies Partial<BubbleMergeError>);

    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "--push",
      input: {
        push: true
      }
    },
    {
      name: "--delete-remote",
      input: {
        deleteRemote: true
      }
    }
  ])("fails closed for started remote merge when $name is requested", async ({ input }) => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_started_flags_01")
    );

    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          ...input
        },
        {
          executeRemoteBubbleMergeCommand,
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED"
    } satisfies Partial<BubbleMergeError>);

    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
  });

  it("uses the local canonical merge path inside a verified remote clone execution context", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupDoneBubble(repoPath, "b_merge_remote_inner_local_01");

    await writeFile(
      bubble.paths.bubbleTomlPath,
      `${renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "prod"
        }
      })}\n`,
      "utf8"
    );

    vi.stubEnv(remoteMergeModeEnvVar, remoteMergeModeInnerRemoteExecution);
    vi.stubEnv(remoteMergeWorkspaceRootEnvVar, repoPath);

    const executeRemoteBubbleMergeCommand = vi.fn(async () => {
      throw new Error("remote merge helper should not run inside verified remote clone execution");
    });
    const resolveRemoteBubbleStatusTarget = vi.fn(async () => {
      throw new Error("remote target resolution should not run inside verified remote clone execution");
    });

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-04-18T12:15:00.000Z")
      },
      {
        executeRemoteBubbleMergeCommand,
        resolveRemoteBubbleStatusTarget
      }
    );

    expect(result.baseBranch).toBe("main");
    expect(result.bubbleBranch).toBe(bubble.config.bubble_branch);
    expect(result.presentationRoute).toBe("local");
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);
    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
    expect(resolveRemoteBubbleStatusTarget).not.toHaveBeenCalled();
  });

  it("treats symlinked workspace-root authority as the same verified remote clone", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupDoneBubble(repoPath, "b_merge_remote_inner_symlink_01");
    const symlinkRoot = await createTempPath("pairflow-merge-symlink-root-");
    const symlinkPath = join(symlinkRoot, "repo-link");
    await symlink(repoPath, symlinkPath);

    await writeFile(
      bubble.paths.bubbleTomlPath,
      `${renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "prod"
        }
      })}\n`,
      "utf8"
    );

    vi.stubEnv(remoteMergeModeEnvVar, remoteMergeModeInnerRemoteExecution);
    vi.stubEnv(remoteMergeWorkspaceRootEnvVar, symlinkPath);

    const executeRemoteBubbleMergeCommand = vi.fn(async () => {
      throw new Error("remote merge helper should not run for symlinked inner remote execution");
    });
    const resolveRemoteBubbleStatusTarget = vi.fn(async () => {
      throw new Error("remote target resolution should not run for symlinked inner remote execution");
    });

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-04-18T12:16:00.000Z")
      },
      {
        executeRemoteBubbleMergeCommand,
        resolveRemoteBubbleStatusTarget
      }
    );

    expect(result.baseBranch).toBe("main");
    expect(result.bubbleBranch).toBe(bubble.config.bubble_branch);
    expect(result.presentationRoute).toBe("local");
    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
    expect(resolveRemoteBubbleStatusTarget).not.toHaveBeenCalled();
  });

  it("persists DONE state before removing a self-hosted verified remote clone repo", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupDoneBubble(repoPath, "b_merge_remote_inner_self_hosted_01");

    await writeFile(
      bubble.paths.bubbleTomlPath,
      `${renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "prod"
        }
      })}\n`,
      "utf8"
    );
    await rm(bubble.paths.worktreePath, { recursive: true, force: true });

    vi.stubEnv(remoteMergeModeEnvVar, remoteMergeModeInnerRemoteExecution);
    vi.stubEnv(remoteMergeWorkspaceRootEnvVar, repoPath);

    const executeRemoteBubbleMergeCommand = vi.fn(async () => {
      throw new Error("remote merge helper should not run inside verified remote clone execution");
    });
    const resolveRemoteBubbleStatusTarget = vi.fn(async () => {
      throw new Error("remote target resolution should not run inside verified remote clone execution");
    });
    const emitBubbleLifecycleEventBestEffort = vi.fn(async () => undefined);
    const cleanupWorktreeWorkspace = vi.fn(async () => {
      await rm(repoPath, { recursive: true, force: true });
      return {
        repoPath,
        bubbleBranch: bubble.config.bubble_branch,
        worktreePath: repoPath,
        removedWorktree: true,
        removedBranch: true
      };
    });

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-04-18T12:17:00.000Z")
      },
      {
        cleanupWorktreeWorkspace,
        executeRemoteBubbleMergeCommand,
        resolveRemoteBubbleStatusTarget,
        emitBubbleLifecycleEventBestEffort
      }
    );

    expect(result.baseBranch).toBe("main");
    expect(result.bubbleBranch).toBe(bubble.config.bubble_branch);
    expect(result.presentationRoute).toBe("local");
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);
    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
    expect(resolveRemoteBubbleStatusTarget).not.toHaveBeenCalled();
    await expect(stat(repoPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    expect(cleanupWorktreeWorkspace).toHaveBeenCalledOnce();
    expect(emitBubbleLifecycleEventBestEffort).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "missing remote pointer",
      setupRemote: async (bubble: Awaited<ReturnType<typeof setupDoneBubble>>) => {
        await writeFile(
          bubble.paths.bubbleTomlPath,
          renderBubbleConfigToml({
            ...bubble.config,
            executor: {
              type: "ssh",
              remote: "prod"
            }
          }),
          "utf8"
        );
        return bubble;
      },
      expectedKind: "missing"
    },
    {
      name: "created remote pointer",
      setupRemote: convertDoneBubbleToRemoteCreated,
      expectedKind: "created"
    }
  ])(
    "fails closed before any local merge fallback for $name",
    async ({ setupRemote, expectedKind }) => {
      const repoPath = await createTempRepo();
      const bubble = await setupRemote(
        await setupDoneBubble(
          repoPath,
          `b_merge_remote_start_required_${expectedKind}_01`
        )
      );

      const runGitSpy = vi.fn(async () => {
        throw new Error("runGit should not be used when remote start is required");
      });
      const executeRemoteBubbleMergeCommand = vi.fn(async () => {
        throw new Error("remote merge helper should not run without started pointer");
      });
      const resolveRemoteBubbleStatusTarget = vi.fn(async () => {
        throw new Error("remote target resolution should not run without started pointer");
      });

      await expect(
        mergeBubble(
          {
            bubbleId: bubble.bubbleId,
            cwd: repoPath
          },
          {
            runGit: runGitSpy,
            executeRemoteBubbleMergeCommand,
            resolveRemoteBubbleStatusTarget
          }
        )
      ).rejects.toMatchObject({
        name: "BubbleMergeError",
        reasonCode: "MERGE_REMOTE_START_REQUIRED"
      } satisfies Partial<BubbleMergeError>);

      expect(runGitSpy).not.toHaveBeenCalled();
      expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
      expect(resolveRemoteBubbleStatusTarget).not.toHaveBeenCalled();
    }
  );

  it("fails closed before remote dispatch when local source repo is dirty", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_dirty_01")
    );
    await writeFile(join(repoPath, "dirty.txt"), "dirty\n", "utf8");

    const executeRemoteBubbleMergeCommand = vi.fn(async () => ({
      bubbleId: bubble.bubbleId,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      mergeCommitSha: "abcdef1234567890",
      importSource: {
        kind: "git_ref" as const,
        ref: `refs/pairflow/import/${bubble.bubbleId}`,
        commitSha: "abcdef1234567890"
      },
      cleanupPending: true as const
    }));

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          executeRemoteBubbleMergeCommand,
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REPO_DIRTY"
    } satisfies Partial<BubbleMergeError>);

    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
  });

  it("fails closed when local reconcile after remote merge cannot be persisted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_reconcile_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble)
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          })),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("disk full");
          })
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_RECONCILE_FAILED"
    } satisfies Partial<BubbleMergeError>);
  });

  it("fails closed when post-success remote cleanup cannot be dispatched after local reconcile", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_cleanup_failed_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });
    const emitBubbleLifecycleEventBestEffort = vi.fn(async () => undefined);

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-18T08:06:00.000Z")
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble)
          ),
          executeRemoteBubbleMergeCleanupCommand: vi.fn(async () => {
            throw new RemoteBubbleMergeCommandError({
              code: "REMOTE_MERGE_CLEANUP_TARGET_MISSING",
              message:
                "REMOTE_MERGE_CLEANUP_TARGET_MISSING: Missing remote clone path /srv/pairflow/repo"
            });
          }),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          })),
          emitBubbleLifecycleEventBestEffort
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_CLEANUP_FAILED",
      context: {
        command_name: "merge",
        bubble_id: bubble.bubbleId,
        remote_alias: "prod",
        remote_host: "ssh.example.com",
        remote_clone_path: `/srv/pairflow/repo--${bubble.bubbleId}`,
        remote_reason_code: "REMOTE_MERGE_CLEANUP_TARGET_MISSING"
      }
    } satisfies Partial<BubbleMergeError>);

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("DONE");
    expect(state.state.last_command_at).toBe("2026-04-18T08:06:00.000Z");
    expect(emitBubbleLifecycleEventBestEffort).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "clone cleanup",
      cleanupResult: (bubble: Awaited<ReturnType<typeof setupDoneBubble>>) =>
        buildRemoteMergeCleanupResult(bubble, {
          removedWorktree: false
        })
    },
    {
      name: "tmux cleanup",
      cleanupResult: (bubble: Awaited<ReturnType<typeof setupDoneBubble>>) =>
        buildRemoteMergeCleanupResult(bubble, {
          tmuxSessionTerminated: false
        })
    },
    {
      name: "runtime cleanup",
      cleanupResult: (bubble: Awaited<ReturnType<typeof setupDoneBubble>>) =>
        buildRemoteMergeCleanupResult(bubble, {
          runtimeSessionRemoved: false
        })
    },
    {
      name: "branch cleanup",
      cleanupResult: (bubble: Awaited<ReturnType<typeof setupDoneBubble>>) =>
        buildRemoteMergeCleanupResult(bubble, {
          removedBubbleBranch: false
        })
    }
  ])("fails closed when started remote merge does not prove $name", async ({ cleanupResult }) => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_cleanup_proof_01")
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: createRemoteRouteGitMock({
            bubbleId: bubble.bubbleId
          }),
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble)
          ),
          executeRemoteBubbleMergeCleanupCommand: vi.fn(async () =>
            cleanupResult(bubble)
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_CLEANUP_PROOF_MISSING"
    } satisfies Partial<BubbleMergeError>);
  });

  it("fails closed when started remote cleanup returns a mismatched remote clone path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_cleanup_path_mismatch_01")
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: createRemoteRouteGitMock({
            bubbleId: bubble.bubbleId
          }),
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble)
          ),
          executeRemoteBubbleMergeCleanupCommand: vi.fn(async () =>
            buildRemoteMergeCleanupResult(bubble, {
              remoteClonePath: `/srv/pairflow/repo--${bubble.bubbleId}-unexpected`
            })
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_CLEANUP_CONTRACT_INVALID"
    } satisfies Partial<BubbleMergeError>);
  });

  it("preserves remote merge conflict taxonomy without local fallback", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_conflict_01")
    );

    const runGitSpy = vi.fn(async (args: string[]) => {
      if (args[0] === "status") {
        return {
          stdout: "",
          stderr: "",
          exitCode: 0
        };
      }
      throw new Error(`Unexpected git command: ${args.join(" ")}`);
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () => {
            throw new RemoteBubbleMergeCommandError({
              code: "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION",
              message:
                "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION: remote merge conflict"
            });
          }),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION"
    } satisfies Partial<BubbleMergeError>);

    expect(runGitSpy).toHaveBeenCalledWith(["status", "--porcelain"], expect.any(Object));
  });

  it("fails closed before remote dispatch when the local base branch is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_missing_base_01")
    );

    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );
    const branchExists = vi.fn(async (_repoPath: string, branch: string) => branch !== "main");

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          branchExists,
          executeRemoteBubbleMergeCommand,
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_BASE_BRANCH_NOT_FOUND"
    } satisfies Partial<BubbleMergeError>);

    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
  });

  it("does not require a local bubble branch before started remote merge dispatch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_missing_branch_01")
    );

    const executeRemoteBubbleMergeCommand = vi.fn(async () =>
      buildRemoteMergeHandoffResult(bubble)
    );
    const executeRemoteBubbleMergeCleanupCommand = vi.fn(async () =>
      buildRemoteMergeCleanupResult(bubble)
    );
    const branchExists = vi.fn(async (_repoPath: string, branch: string) =>
      branch === bubble.config.base_branch
    );
    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        branchExists,
        runGit: runGitSpy,
        executeRemoteBubbleMergeCommand,
        executeRemoteBubbleMergeCleanupCommand,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }))
      }
    );

    expect(result.presentationRoute).toBe("started_remote");
    expect(branchExists).toHaveBeenCalledTimes(1);
    expect(branchExists.mock.calls[0]?.[1]).toBe(bubble.config.base_branch);
    expect(executeRemoteBubbleMergeCommand).toHaveBeenCalledOnce();
    expect(executeRemoteBubbleMergeCleanupCommand).toHaveBeenCalledOnce();
  });

  it("fails closed when local fetch import fails after remote dispatch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_fetch_fail_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId,
      fetchError: new GitCommandError(
        [
          "fetch",
          "--no-tags",
          "ssh://pairflow@ssh.example.com/srv/pairflow/repo--b_merge_remote_fetch_fail_01",
          `refs/pairflow/import/${bubble.bubbleId}:refs/pairflow/import/${bubble.bubbleId}`
        ],
        1,
        "fetch failed"
      )
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble)
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_IMPORT_FAILED"
    } satisfies Partial<BubbleMergeError>);

    expect(runGitSpy).toHaveBeenCalledWith(
      [
        "fetch",
        "--no-tags",
        "ssh://pairflow@ssh.example.com/srv/pairflow/repo--b_merge_remote_fetch_fail_01",
        `refs/pairflow/import/${bubble.bubbleId}:refs/pairflow/import/${bubble.bubbleId}`
      ],
      expect.any(Object)
    );
  });

  it("uses an encoded ssh URL when importing from a remote clone path with reserved characters", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_encoded_url_01")
    );

    await writeFile(
      bubble.paths.remotePointerPath,
      JSON.stringify(
        {
          kind: "started",
          host: "ssh.example.com",
          instanceId: `inst_${bubble.bubbleId}`,
          remoteClonePath: "/srv/pairflow remote/repo#with?reserved",
          tmuxSession: `pf-${bubble.bubbleId}`,
          startedAt: "2026-04-18T08:00:00.000Z"
        },
        null,
        2
      ),
      "utf8"
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        runGit: runGitSpy,
        executeRemoteBubbleMergeCommand: vi.fn(async () =>
          buildRemoteMergeHandoffResult(bubble)
        ),
        executeRemoteBubbleMergeCleanupCommand: vi.fn(async () =>
          buildRemoteMergeCleanupResult(bubble, {
            remoteClonePath: "/srv/pairflow remote/repo#with?reserved"
          })
        ),
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }))
      }
    );

    expect(runGitSpy).toHaveBeenCalledWith(
      [
        "fetch",
        "--no-tags",
        "ssh://pairflow@ssh.example.com/srv/pairflow%20remote/repo%23with%3Freserved",
        `refs/pairflow/import/${bubble.bubbleId}:refs/pairflow/import/${bubble.bubbleId}`
      ],
      expect.any(Object)
    );
  });

  it("fails closed when the remote handoff ref does not match the expected hidden ref", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_ref_mismatch_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble, {
              importSourceRef: `refs/pairflow/import/${bubble.bubbleId}-other`
            })
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_HANDOFF_INVALID"
    } satisfies Partial<BubbleMergeError>);

    expect(runGitSpy).not.toHaveBeenCalledWith(
      expect.arrayContaining(["fetch"]),
      expect.anything()
    );
  });

  it("fails closed when the remote handoff base branch does not match the expected local base branch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_base_mismatch_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble, {
              baseBranch: "release"
            })
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_HANDOFF_INVALID"
    } satisfies Partial<BubbleMergeError>);

    expect(runGitSpy).not.toHaveBeenCalledWith(
      expect.arrayContaining(["fetch"]),
      expect.anything()
    );
  });

  it("fails closed when the remote handoff bubble branch does not match the expected local bubble branch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_branch_mismatch_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble, {
              bubbleBranch: `${bubble.config.bubble_branch}-other`
            })
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_HANDOFF_INVALID"
    } satisfies Partial<BubbleMergeError>);

    expect(runGitSpy).not.toHaveBeenCalledWith(
      expect.arrayContaining(["fetch"]),
      expect.anything()
    );
  });

  it("fails closed with merge-specific import taxonomy when imported hidden-ref dereference fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_rev_parse_fail_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId,
      revParseError: new GitCommandError(
        ["rev-parse", `refs/pairflow/import/${bubble.bubbleId}^{commit}`],
        1,
        "not a commit"
      )
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble)
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_IMPORT_FAILED"
    } satisfies Partial<BubbleMergeError>);
  });

  it("fails closed when local merge after import requires manual resolution", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_local_conflict_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId,
      mergeError: new GitCommandError(
        ["merge", "--no-ff", "--no-edit", `refs/pairflow/import/${bubble.bubbleId}`],
        1,
        "merge conflict"
      )
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble)
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION"
    } satisfies Partial<BubbleMergeError>);

    expect(runGitSpy).toHaveBeenCalledWith(
      ["merge", "--abort"],
      expect.objectContaining({
        allowFailure: true
      })
    );
  });

  it("fails closed when imported hidden-ref commit does not match the handoff payload", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_commit_mismatch_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId,
      importedCommitSha: "9999999999999999"
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () =>
            buildRemoteMergeHandoffResult(bubble, {
              importSourceCommitSha: "abcdef1234567890"
            })
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_HANDOFF_INVALID"
    } satisfies Partial<BubbleMergeError>);
  });

  it("fails closed when the parsed remote handoff import source is malformed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_import_source_invalid_01")
    );

    const runGitSpy = createRemoteRouteGitMock({
      bubbleId: bubble.bubbleId
    });

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runGit: runGitSpy,
          executeRemoteBubbleMergeCommand: vi.fn(async () => ({
            ...buildRemoteMergeHandoffResult(bubble),
            importSource: null
          } as unknown as ReturnType<typeof buildRemoteMergeHandoffResult>)),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "BubbleMergeError",
      reasonCode: "MERGE_REMOTE_HANDOFF_INVALID"
    } satisfies Partial<BubbleMergeError>);

    expect(runGitSpy).not.toHaveBeenCalledWith(
      expect.arrayContaining(["fetch"]),
      expect.anything()
    );
  });
});
