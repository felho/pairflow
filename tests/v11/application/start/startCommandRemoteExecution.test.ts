import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderBubbleConfigToml } from "../../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../../src/v11/defaults/create/createBubbleApi.js";
import {
  remoteCloneStartModeEnvVar,
  remoteCloneStartModeValue,
  remoteCloneWorkspaceRootEnvVar,
  resolveRemoteCloneStartContextFromEnv,
  runRemoteCloneInnerStart,
  runRemoteStartExecution
} from "../../../../src/v11/application/start/startCommandRemoteExecution.js";
import type { StartExecutionContext } from "../../../../src/v11/application/start/startCommandContext.js";
import type { ResolvedStartBubbleDependencies } from "../../../../src/v11/application/start/startCommandOrchestration.js";
import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";
import { RemoteBubbleStartError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleStart.js";
import type { UpsertRuntimeSessionInput } from "../../../../src/v11/ports/runtimeSessions.js";
import type { WriteStateSnapshotOptions } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import {
  readRemotePointer,
  readRemoteStateCache,
  writeRemotePointer
} from "../../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import {
  resolveDocContractGateArtifactPath
} from "../../../../src/v11/defaults/gates/docContractGateArtifactDefaults.js";
import { runGit as runGitCommand } from "../../../../src/v11/infrastructure/workspace/git.js";
import { initGitRepository, runGit } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix: string = "pairflow-start-remote-exec-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function addOriginRemote(repoPath: string, remoteName: string = "origin"): Promise<string> {
  const remotePath = await mkdtemp(join(tmpdir(), "pairflow-start-origin-"));
  tempDirs.push(remotePath);
  await runGit(remotePath, ["init", "--bare"]);
  await runGit(repoPath, ["remote", "add", remoteName, remotePath]);
  return remotePath;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true
  })));
  delete process.env.PAIRFLOW_WORKTREE_ROOT;
  delete process.env[remoteCloneStartModeEnvVar];
  delete process.env[remoteCloneWorkspaceRootEnvVar];
});

async function createRemoteStartFixture(): Promise<{
  created: Awaited<ReturnType<typeof createBubble>>;
  context: StartExecutionContext;
}> {
  const repoPath = await createTempRepo();
  await addOriginRemote(repoPath);
  const created = await createBubble({
    id: "b_remote_execution_unit_01",
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Remote execution unit test",
    cwd: repoPath
  });

  await writeFile(
    created.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...created.config,
      executor: {
        type: "ssh",
        remote: "homelab"
      }
    }),
    "utf8"
  );
  await writeRemotePointer(created.paths.remotePointerPath, {
    kind: "created",
    host: "homelab"
  });

  const loadedState = await readStateSnapshot(created.paths.statePath);
  const policySnapshotPathAbs = join(
    created.paths.artifactsDir,
    "reviewer-policy-snapshot.md"
  );
  await writeFile(policySnapshotPathAbs, "policy snapshot\n", "utf8");

  return {
    created,
    context: {
      resolved: {
        bubbleId: created.bubbleId,
        repoPath,
        bubbleConfig: {
          ...created.config,
          executor: {
            type: "ssh",
            remote: "homelab"
          }
        },
        bubblePaths: created.paths
      },
      loadedState,
      startMode: "fresh",
      nowIso: "2026-04-16T12:45:00.000Z",
      policySnapshotPathAbs
    } as unknown as StartExecutionContext
  };
}

function createRemoteExecutionDeps(overrides: Partial<ResolvedStartBubbleDependencies> = {}): ResolvedStartBubbleDependencies {
  return {
    loadPairflowGlobalConfig: async () => ({
      remotes: {
        homelab: {
          host: "homelab",
          repo_base: "~/repos"
        }
      }
    }),
    runGitCommand,
    readRemotePointer,
    resolveDocContractGateArtifactPath,
    writeRemotePointer,
    writeRemoteStateCache: async () => undefined,
    removeRemoteStateCache: async () => undefined,
    upsertSession: async (input) => ({
      bubbleId: String(input.bubbleId),
      repoPath: String(input.repoPath),
      worktreePath: String(input.worktreePath),
      ...(input.workspacePath !== undefined
        ? { workspacePath: input.workspacePath }
        : {}),
      ...(input.workspaceKind !== undefined
        ? { workspaceKind: input.workspaceKind }
        : {}),
      tmuxSessionName: String(input.tmuxSessionName),
      updatedAt: "2026-04-16T12:45:00.000Z"
    }),
    writeState: writeStateSnapshot,
    executeRemoteBubbleStart: async (input) => ({
      remoteClonePath: input.remoteClonePath,
      tmuxSessionName: "pf-b_remote_execution_unit_01",
      startedAt: "2026-04-16T12:45:00.000Z",
      instanceId: "inst_remote_unit_01",
      remoteState: {
        lastCheckedAt: "2026-04-16T12:45:01.000Z",
        state: "RUNNING",
        round: 1,
        maxRounds: 8,
        implementerStatus: "running",
        reviewerStatus: "idle"
      }
    }),
    reportWarning: () => undefined,
    ...overrides
  } as ResolvedStartBubbleDependencies;
}

describe("startCommandRemoteExecution", () => {
  it("fails closed when inner remote start is invoked outside fresh CREATED state", async () => {
    const context = {
      resolved: {
        bubbleId: "b_remote_inner_guard_01",
        repoPath: "/tmp/repo",
        bubblePaths: {
          statePath: "/tmp/repo/.pairflow/bubbles/b_remote_inner_guard_01/state.json"
        }
      },
      loadedState: {
        state: {
          state: "RUNNING"
        }
      },
      startMode: "resume",
      nowIso: "2026-04-16T12:00:00.000Z",
      remoteStartContext: {
        kind: "remote_clone" as const,
        workspaceRoot: "/tmp/repo"
      }
    } as unknown as StartExecutionContext;

    await expect(
      runRemoteCloneInnerStart({
        context,
        deps: {} as ResolvedStartBubbleDependencies,
        progress: {
          workspaceBootstrapped: false,
          preparingState: null,
          preparingFingerprint: null
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_INNER_START_FRESH_ONLY"
    });
  });

  it("persists canonical workspace authority before launching the remote reviewer session", async () => {
    const { context } = await createRemoteStartFixture();
    const upsertCalls: UpsertRuntimeSessionInput[] = [];
    context.now = new Date("2026-04-16T12:00:00.000Z");
    context.expectedTmuxSessionName = "pf-b_remote_execution_unit_01";
    context.runtimeSessionRecord = {
      bubbleId: context.resolved.bubbleId,
      repoPath: context.resolved.repoPath,
      worktreePath: context.resolved.bubblePaths.worktreePath,
      tmuxSessionName: "pf-b_remote_execution_unit_01",
      updatedAt: "2026-04-16T11:59:00.000Z"
    };
    context.remoteStartContext = {
      kind: "remote_clone" as const,
      workspaceRoot: context.resolved.repoPath
    };

    const result = await runRemoteCloneInnerStart({
      context,
      deps: {
        upsertSession: async (input: UpsertRuntimeSessionInput) => {
          upsertCalls.push(input);
          return {
            bubbleId: String(input.bubbleId),
            repoPath: String(input.repoPath),
            worktreePath: String(input.worktreePath),
            workspacePath: String(input.workspacePath),
            workspaceKind: input.workspaceKind,
            tmuxSessionName: String(input.tmuxSessionName),
            updatedAt: "2026-04-16T12:00:00.000Z"
          };
        },
        writeState: async (
          statePath: string,
          state: BubbleStateSnapshot,
          options: WriteStateSnapshotOptions
        ) =>
          writeStateSnapshot(statePath, state, options),
        launchSessionAck: async () => ({
          status: "running",
          sessionName: "pf-b_remote_execution_unit_01"
        })
      } as unknown as ResolvedStartBubbleDependencies,
      progress: {
        workspaceBootstrapped: false,
        preparingState: null,
        preparingFingerprint: null
      }
    });

    expect(upsertCalls).toEqual([
      {
        sessionsPath: context.resolved.bubblePaths.sessionsPath,
        bubbleId: context.resolved.bubbleId,
        repoPath: context.resolved.repoPath,
        worktreePath: context.resolved.bubblePaths.worktreePath,
        workspacePath: context.resolved.repoPath,
        workspaceKind: "worktree",
        tmuxSessionName: "pf-b_remote_execution_unit_01",
        now: new Date("2026-04-16T12:00:00.000Z")
      }
    ]);
    expect(result.runtimeWorkspacePath).toBe(context.resolved.repoPath);
  });

  it("fails closed when the remote pointer is not in created state", async () => {
    const { context } = await createRemoteStartFixture();
    await writeRemotePointer(context.resolved.bubblePaths.remotePointerPath, {
      kind: "started",
      host: "homelab",
      instanceId: "inst_existing",
      remoteClonePath: "/home/dev/repos/bubble",
      tmuxSession: "pf-existing",
      startedAt: "2026-04-16T12:44:00.000Z"
    });

    await expect(
      runRemoteStartExecution({
        context,
        deps: createRemoteExecutionDeps(),
        progress: {
          workspaceBootstrapped: false,
          preparingState: null,
          preparingFingerprint: null
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_POINTER_INVALID"
    });
  });

  it("persists local runtime session authority after remote start confirmation", async () => {
    const { context } = await createRemoteStartFixture();
    context.now = new Date("2026-04-16T12:45:00.000Z");
    const upsertCalls: UpsertRuntimeSessionInput[] = [];
    const expectedRemoteClonePath =
      `~/repos/${basename(context.resolved.repoPath)}--${context.resolved.bubbleId}`;

    const result = await runRemoteStartExecution({
      context,
      deps: createRemoteExecutionDeps({
        upsertSession: async (input: UpsertRuntimeSessionInput) => {
          upsertCalls.push(input);
          return {
            bubbleId: String(input.bubbleId),
            repoPath: String(input.repoPath),
            worktreePath: String(input.worktreePath),
            ...(input.workspacePath !== undefined
              ? { workspacePath: String(input.workspacePath) }
              : {}),
            ...(input.workspaceKind !== undefined
              ? { workspaceKind: input.workspaceKind }
              : {}),
            tmuxSessionName: String(input.tmuxSessionName),
            updatedAt: "2026-04-16T12:45:00.000Z"
          };
        }
      }),
      progress: {
        workspaceBootstrapped: false,
        preparingState: null,
        preparingFingerprint: null
      }
    });

    expect(upsertCalls).toEqual([
      {
        sessionsPath: context.resolved.bubblePaths.sessionsPath,
        bubbleId: context.resolved.bubbleId,
        repoPath: context.resolved.repoPath,
        worktreePath: context.resolved.bubblePaths.worktreePath,
        workspacePath: expectedRemoteClonePath,
        workspaceKind: "worktree",
        tmuxSessionName: "pf-b_remote_execution_unit_01",
        now: new Date("2026-04-16T12:45:00.000Z")
      }
    ]);
    expect(result.runtimeWorkspacePath).toBe(expectedRemoteClonePath);
    expect(result.tmuxSessionName).toBe("pf-b_remote_execution_unit_01");
  });

  it("fails closed when the created pointer host drifts from the configured execution host", async () => {
    const { context } = await createRemoteStartFixture();
    await writeRemotePointer(context.resolved.bubblePaths.remotePointerPath, {
      kind: "created",
      host: "old-host"
    });

    await expect(
      runRemoteStartExecution({
        context,
        deps: createRemoteExecutionDeps(),
        progress: {
          workspaceBootstrapped: false,
          preparingState: null,
          preparingFingerprint: null
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_POINTER_INVALID"
    });
  });

  it("fails closed when the remote confirmation snapshot is not RUNNING", async () => {
    const { created, context } = await createRemoteStartFixture();

    await expect(
      runRemoteStartExecution({
        context,
        deps: createRemoteExecutionDeps({
          executeRemoteBubbleStart: async () => {
            throw new RemoteBubbleStartError({
              code: "REMOTE_CONFIRMATION_INVALID",
              message:
                "Remote start confirmation for bubble b_remote_execution_unit_01 expected RUNNING but received FAILED.",
              details: {
                receivedState: "FAILED",
                receivedRound: 1
              }
            });
          }
        }),
        progress: {
          workspaceBootstrapped: false,
          preparingState: null,
          preparingFingerprint: null
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_CONFIRMATION_INVALID"
    });

    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
    await expect(readRemoteStateCache(created.paths.remoteStateCachePath)).resolves.toBeNull();
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "PREPARING_WORKSPACE"
      }
    });
  });

  it("fails closed before PREPARING_WORKSPACE when required control artifacts cannot be read", async () => {
    const { created, context } = await createRemoteStartFixture();
    await rm(created.paths.taskArtifactPath, { force: true });
    const executeRemoteBubbleStart = vi.fn(async () => ({
      remoteClonePath: "/remote/repo",
      tmuxSessionName: "pf-b_remote_execution_unit_01",
      startedAt: "2026-04-16T12:45:00.000Z",
      instanceId: "inst_remote_unit_01",
      remoteState: {
        lastCheckedAt: "2026-04-16T12:45:01.000Z",
        state: "RUNNING" as const,
        round: 1,
        maxRounds: 8,
        implementerStatus: "running" as const,
        reviewerStatus: "idle" as const
      }
    }));

    const error = await runRemoteStartExecution({
      context,
      deps: createRemoteExecutionDeps({
        executeRemoteBubbleStart
      }),
      progress: {
        workspaceBootstrapped: false,
        preparingState: null,
        preparingFingerprint: null
      }
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      reasonCode: "START_REMOTE_CONTROL_FILES_UNAVAILABLE",
      context: {
        artifact_relative_path:
          `.pairflow/bubbles/${context.resolved.bubbleId}/artifacts/task.md`,
        artifact_source_path: created.paths.taskArtifactPath,
        artifact_kind: "task",
        artifact_requirement: "required"
      }
    });
    expect(error).toBeInstanceOf(Error);

    if (!(error instanceof Error)) {
      throw new Error("Expected remote control artifact failure to reject with Error.");
    }
    expect(executeRemoteBubbleStart).not.toHaveBeenCalled();
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "CREATED"
      }
    });
  });

  it("fails closed when remote workspace env leaks without the matching remote activation mode", () => {
    process.env[remoteCloneWorkspaceRootEnvVar] = "/tmp/remote-workspace";

    expect(() => resolveRemoteCloneStartContextFromEnv()).toThrow(/without the matching remote activation mode/u);
  });

  it("parses the remote clone context when both remote env vars are present", () => {
    process.env[remoteCloneStartModeEnvVar] = remoteCloneStartModeValue;
    process.env[remoteCloneWorkspaceRootEnvVar] = "/tmp/remote-workspace";

    expect(resolveRemoteCloneStartContextFromEnv()).toEqual({
      kind: "remote_clone",
      workspaceRoot: "/tmp/remote-workspace"
    });
  });

  it("returns explicit reconciliation failure after remote confirmation when RUNNING persistence fails", async () => {
    const { created, context } = await createRemoteStartFixture();

    await expect(
      runRemoteStartExecution({
        context,
        deps: createRemoteExecutionDeps({
          writeState: async (statePath, state, options) => {
            if (state.state === "RUNNING") {
              throw new Error("forced running persistence failure");
            }
            return writeStateSnapshot(statePath, state, options);
          },
          writeRemoteStateCache: async (path, value) => {
            await writeFile(path, `${JSON.stringify(value)}\n`, "utf8");
          },
          removeRemoteStateCache: async (path) => {
            await rm(path, { force: true });
          }
        }),
        progress: {
          workspaceBootstrapped: false,
          preparingState: null,
          preparingFingerprint: null
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_RECONCILIATION_FAILED"
    });

    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
    await expect(readRemoteStateCache(created.paths.remoteStateCachePath)).resolves.toBeNull();
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "FAILED"
      }
    });
  });

  it("surfaces rollback failure diagnostics when reconciliation rollback also fails", async () => {
    const { context } = await createRemoteStartFixture();

    const result = await runRemoteStartExecution({
      context,
      deps: createRemoteExecutionDeps({
        writeState: async (statePath, state, options) => {
          if (state.state === "RUNNING") {
            throw new Error("forced running persistence failure");
          }
          return writeStateSnapshot(statePath, state, options);
        },
        removeRemoteStateCache: async () => {
          throw new Error("forced cache rollback failure");
        },
        writeRemotePointer: async () => {
          throw new Error("forced pointer rollback failure");
        }
      }),
      progress: {
        workspaceBootstrapped: false,
        preparingState: null,
        preparingFingerprint: null
      }
    }).catch((error: unknown) => error);

    expect(result).toMatchObject({
      reasonCode: "START_REMOTE_RECONCILIATION_ROLLBACK_FAILED"
    });
    if (!(result instanceof Error) || !("context" in result)) {
      throw new Error("Expected rollback failure to carry structured context.");
    }
    const errorContext = result.context as { rollback_failures?: string[] } | undefined;
    expect(errorContext?.rollback_failures).toEqual([
      "remote_state_cache=forced cache rollback failure",
      "remote_pointer=forced pointer rollback failure"
    ]);
  });
});
