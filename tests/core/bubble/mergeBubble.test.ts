import { mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import {
  BubbleMergeErrorV11 as BubbleMergeError,
  mergeBubbleV11 as mergeBubble
} from "../../../src/v11/application/merge/emitMergeV11.js";
import {
  remoteMergeModeEnvVar,
  remoteMergeModeInnerRemoteExecution,
  remoteMergeWorkspaceRootEnvVar
} from "../../../src/v11/application/merge/remoteMergeExecutionContext.js";
import { RemoteBubbleMergeCommandError } from "../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";

const tempDirs: string[] = [];

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

  it("routes started remote merge through the remote helper without local git merge fallback", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_started_01")
    );

    const executeRemoteBubbleMergeCommand = vi.fn(async () => ({
      bubbleId: bubble.bubbleId,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      mergeCommitSha: "abcdef1234567890",
      pushedBaseBranch: true,
      deletedRemoteBranch: false,
      tmuxSessionName: `pf-${bubble.bubbleId}`,
      tmuxSessionExisted: true,
      runtimeSessionRemoved: true,
      removedWorktree: true,
      removedBubbleBranch: true
    }));
    const runGitSpy = vi.fn(async () => {
      throw new Error("runGit should not be used for remote started merge routing");
    });

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        push: true,
        now: new Date("2026-04-18T08:05:00.000Z")
      },
      {
        runGit: runGitSpy,
        executeRemoteBubbleMergeCommand,
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
      push: true,
      deleteRemote: false
    });
    expect(runGitSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      bubbleId: bubble.bubbleId,
      mergeCommitSha: "abcdef1234567890",
      pushedBaseBranch: true,
      removedWorktree: true,
      removedBubbleBranch: true
    });

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.last_command_at).toBe("2026-04-18T08:05:00.000Z");
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
    expect(executeRemoteBubbleMergeCommand).not.toHaveBeenCalled();
    expect(resolveRemoteBubbleStatusTarget).not.toHaveBeenCalled();
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

  it("fails closed when started remote merge has no publication proof", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_publication_01")
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          push: true
        },
        {
          executeRemoteBubbleMergeCommand: vi.fn(async () => {
            throw new RemoteBubbleMergeCommandError({
              code: "REMOTE_MERGE_PUBLICATION_REQUIRED",
              message:
                `Remote merge succeeded without durable publication proof for bubble ${bubble.bubbleId}.`
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
      reasonCode: "REMOTE_MERGE_PUBLICATION_REQUIRED"
    } satisfies Partial<BubbleMergeError>);
  });

  it("fails closed when local reconcile after remote merge cannot be persisted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_reconcile_01")
    );

    await expect(
      mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          push: true
        },
        {
          executeRemoteBubbleMergeCommand: vi.fn(async () => ({
            bubbleId: bubble.bubbleId,
            baseBranch: "main",
            bubbleBranch: bubble.config.bubble_branch,
            mergeCommitSha: "abcdef1234567890",
            pushedBaseBranch: true,
            deletedRemoteBranch: true,
            tmuxSessionName: `pf-${bubble.bubbleId}`,
            tmuxSessionExisted: true,
            runtimeSessionRemoved: true,
            removedWorktree: true,
            removedBubbleBranch: true
          })),
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

  it("preserves remote merge conflict taxonomy without local fallback", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubble(repoPath, "b_merge_remote_conflict_01")
    );

    const runGitSpy = vi.fn(async () => {
      throw new Error("runGit should not be used for remote conflict routing");
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

    expect(runGitSpy).not.toHaveBeenCalled();
  });
});
