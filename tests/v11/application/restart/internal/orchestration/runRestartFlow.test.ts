import { mkdir, mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { runRestartFlow } from "../../../../../../src/v11/application/restart/internal/orchestration/runRestartFlow.js"
import {
  persistPassValidationRecoveryMarker,
  resolvePassValidationRecoveryRepoMarkerPath
} from "../../../../../../src/v11/infrastructure/artifact/validation/passValidationEvidence.js"
import type { ResolvedRestartBubbleDependencies } from "../../../../../../src/v11/application/restart/internal/preparation/restartCommandDependencyResolution.js"

const tempDirs: string[] = []

afterEach(async () => {
  while (tempDirs.length > 0) {
    const next = tempDirs.pop()
    if (next !== undefined) {
      await rm(next, { recursive: true, force: true })
    }
  }
})

function createDependencies(
  overrides: Partial<ResolvedRestartBubbleDependencies>
): ResolvedRestartBubbleDependencies {
  return {
    resolveBubbleById: async () =>
      ({
        bubbleId: "b_restart_01",
        repoPath: "/tmp/repo",
        bubbleConfig: {} as never,
        bubblePaths: {
          sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
          worktreePath: "/tmp/worktree",
          remotePointerPath: "/tmp/repo/.pairflow/bubbles/b_restart_01/remote.json"
        }
      }) as never,
    readRemotePointer: async () => null,
    terminateBubbleTmuxSession: async () => ({ existed: true }) as never,
    removeRuntimeSession: async () => true,
    persistPassValidationRecoveryMarker: async () => ({
      persisted_targets: ["repo:repo_runtime_marker"],
      warnings: []
    }),
    startBubble: async () =>
      ({
        bubbleId: "b_restart_01",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_01",
        worktreePath: "/tmp/worktree"
      }) as never,
    ...overrides
  }
}

describe("runRestartFlow", () => {
  it("persists the recovery marker before tmux termination and runtime-session removal", async () => {
    const callSequence: string[] = []

    await runRestartFlow(
      {
        bubbleId: "b_restart_01"
      },
      createDependencies({
        persistPassValidationRecoveryMarker: async () => {
          callSequence.push("persist")
          return {
            persisted_targets: ["repo:repo_runtime_marker"],
            warnings: []
          }
        },
        terminateBubbleTmuxSession: async () => {
          callSequence.push("terminate")
          return { existed: true } as never
        },
        removeRuntimeSession: async () => {
          callSequence.push("remove")
          return true
        },
        startBubble: async () => {
          callSequence.push("start")
          return {
            bubbleId: "b_restart_01",
            state: {
              state: "RUNNING"
            },
            tmuxSessionName: "pf-b_restart_01",
            worktreePath: "/tmp/worktree"
          } as never
        }
      })
    )

    expect(callSequence).toEqual(["persist", "terminate", "remove", "start"])
  })

  it("keeps restart successful when recovery marker persistence returns a warning", async () => {
    const result = await runRestartFlow(
      {
        bubbleId: "b_restart_01"
      },
      createDependencies({
        persistPassValidationRecoveryMarker: async () => ({
          persisted_targets: ["repo:repo_runtime_marker"],
          warnings: [
            {
              reason_code: "pass_validation_recovery_marker_persist_failed",
              message: "worktree marker failed",
              metadata: {
                flow: "restart",
                marker_scope: "worktree",
                target_path_kind: "worktree_marker",
                target_path_exists: false,
                failed_targets: ["worktree:worktree_marker"],
                persisted_targets: ["repo:repo_runtime_marker"],
                repo_marker_path: "/tmp/repo/.pairflow/runtime/pass-validation-recovery-b_restart_01.json",
                worktree_marker_path: "/tmp/worktree/.pairflow/pass-validation-recovery.json",
                worktreePathRequested: true
              }
            }
          ]
        })
      })
    )

    expect(result.state.state).toBe("RUNNING")
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings?.[0]?.reason_code).toBe(
      "pass_validation_recovery_marker_persist_failed"
    )
  })

  it("persists the repo-level marker without creating a missing worktree marker path", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-restart-flow-"))
    tempDirs.push(repoPath)
    await mkdir(join(repoPath, ".pairflow", "runtime"), { recursive: true })

    const missingWorktreePath = join(repoPath, "..", "missing-worktree")
    const result = await runRestartFlow(
      {
        bubbleId: "b_restart_01"
      },
      createDependencies({
        resolveBubbleById: async () =>
          ({
            bubbleId: "b_restart_01",
            repoPath,
            bubbleConfig: {} as never,
            bubblePaths: {
              sessionsPath: join(repoPath, ".pairflow", "runtime", "sessions.json"),
              worktreePath: missingWorktreePath,
              remotePointerPath: join(repoPath, ".pairflow", "bubbles", "b_restart_01", "remote.json")
            }
          }) as never,
        persistPassValidationRecoveryMarker,
        startBubble: async () =>
          ({
            bubbleId: "b_restart_01",
            state: {
              state: "RUNNING"
            },
            tmuxSessionName: "pf-b_restart_01",
            worktreePath: missingWorktreePath
          }) as never
      })
    )

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings?.[0]?.metadata.marker_scope).toBe("worktree")
    expect(result.warnings?.[0]?.metadata.persisted_targets).toContain(
      "repo:repo_runtime_marker"
    )
    await expect(
      stat(resolvePassValidationRecoveryRepoMarkerPath(repoPath, "b_restart_01"))
    ).resolves.toBeTruthy()
  })

  it("keeps restart successful when the repo-level recovery marker cannot be persisted", async () => {
    const terminateBubbleTmuxSession = vi.fn(async () => ({ existed: true }) as never)
    const removeRuntimeSession = vi.fn(async () => true)
    const startBubble = vi.fn(async () =>
      ({
        bubbleId: "b_restart_01",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_01",
        worktreePath: "/tmp/worktree"
      }) as never
    )

    const result = await runRestartFlow(
      {
        bubbleId: "b_restart_01"
      },
      createDependencies({
        persistPassValidationRecoveryMarker: async () => ({
          persisted_targets: [],
          warnings: [
            {
              reason_code: "pass_validation_recovery_marker_persist_failed",
              message: "repo marker failed",
              metadata: {
                flow: "restart",
                marker_scope: "repo",
                target_path_kind: "repo_runtime_marker",
                target_path_exists: false,
                error_code: "EACCES",
                failed_targets: ["repo:repo_runtime_marker"],
                persisted_targets: [],
                repo_marker_path:
                  "/tmp/repo/.pairflow/runtime/pass-validation-recovery-b_restart_01.json",
                worktree_marker_path: "/tmp/worktree/.pairflow/pass-validation-recovery.json",
                worktreePathRequested: true
              }
            }
          ]
        }),
        terminateBubbleTmuxSession,
        removeRuntimeSession,
        startBubble
      })
    )
    expect(result.state.state).toBe("RUNNING")
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings?.[0]?.metadata.marker_scope).toBe("repo")
    expect(terminateBubbleTmuxSession).toHaveBeenCalledTimes(1)
    expect(removeRuntimeSession).toHaveBeenCalledTimes(1)
    expect(startBubble).toHaveBeenCalledTimes(1)
  })

  it("surfaces start-time launch failures after cleanup without projecting synthetic success", async () => {
    const terminateBubbleTmuxSession = vi.fn(async () => ({ existed: true }) as never)
    const removeRuntimeSession = vi.fn(async () => true)

    await expect(
      runRestartFlow(
        {
          bubbleId: "b_restart_01"
        },
        createDependencies({
          terminateBubbleTmuxSession,
          removeRuntimeSession,
          startBubble: async () => {
            throw Object.assign(new Error("tmux launch rejected in test"), {
              reasonCode: "LAUNCH_ACK_COMMAND_FAILED"
            })
          }
        })
      )
    ).rejects.toMatchObject({
      reasonCode: "LAUNCH_ACK_COMMAND_FAILED"
    })

    expect(terminateBubbleTmuxSession).toHaveBeenCalledTimes(1)
    expect(removeRuntimeSession).toHaveBeenCalledTimes(1)
  })

  it("fails closed before cleanup when remote started-state authority is present", async () => {
    const terminateBubbleTmuxSession = vi.fn(async () => ({ existed: true }) as never)
    const removeRuntimeSession = vi.fn(async () => true)
    const persistPassValidationRecoveryMarker = vi.fn(async () => ({
      persisted_targets: ["repo:repo_runtime_marker"],
      warnings: []
    }))
    const startBubble = vi.fn(async () =>
      ({
        bubbleId: "b_restart_01",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_01",
        worktreePath: "/tmp/worktree"
      }) as never
    )

    await expect(
      runRestartFlow(
        {
          bubbleId: "b_restart_01"
        },
        createDependencies({
          readRemotePointer: async () => ({
            kind: "started",
            host: "spark1",
            instanceId: "inst_01",
            remoteClonePath: "/remote/repos/pairflow--b_restart_01",
            tmuxSession: "pf-b_restart_01",
            startedAt: "2026-04-20T18:00:00.000Z"
          }),
          terminateBubbleTmuxSession,
          removeRuntimeSession,
          persistPassValidationRecoveryMarker,
          startBubble
        })
      )
    ).rejects.toMatchObject({
      reasonCode: "RESTART_REMOTE_STARTED_UNSUPPORTED"
    })

    expect(persistPassValidationRecoveryMarker).not.toHaveBeenCalled()
    expect(terminateBubbleTmuxSession).not.toHaveBeenCalled()
    expect(removeRuntimeSession).not.toHaveBeenCalled()
    expect(startBubble).not.toHaveBeenCalled()
  })
})
