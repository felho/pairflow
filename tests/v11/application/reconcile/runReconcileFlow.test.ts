import { mkdir, mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  persistPassValidationRecoveryMarker,
  resolvePassValidationRecoveryRepoMarkerPath,
  resolvePassValidationRecoveryWorktreeMarkerPath
} from "../../../../src/v11/infrastructure/artifact/validation/passValidationEvidence.js"
import { runReconcileFlow } from "../../../../src/v11/application/reconcile/runReconcileFlow.js"
import type { ResolvedReconcileRuntimeSessionsDependencies } from "../../../../src/v11/application/reconcile/reconcileCommandDependencyResolution.js"

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
  overrides: Partial<ResolvedReconcileRuntimeSessionsDependencies>
): ResolvedReconcileRuntimeSessionsDependencies {
  return {
    resolveRepoPath: async () => "/tmp/repo",
    listBubbleIdSet: async () => new Set<string>(),
    readRuntimeSessionsRegistry: async () => ({}),
    removeRuntimeSessions: async () => ({
      removedBubbleIds: [],
      missingBubbleIds: []
    }),
    persistPassValidationRecoveryMarker,
    readStateSnapshot: async () => {
      throw new Error("not used")
    },
    isTmuxSessionAlive: async () => false,
    isFinalState: () => false,
    countRegistryEntries: (registry) => Object.keys(registry).length,
    ...overrides
  }
}

describe("runReconcileFlow", () => {
  it("writes the repo-level marker and does not create a phantom worktree path for missing bubbles", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-reconcile-flow-"))
    tempDirs.push(repoPath)
    await mkdir(join(repoPath, ".pairflow", "runtime"), { recursive: true })

    const missingWorktreePath = join(repoPath, "..", "missing-bubble-worktree")
    const result = await runReconcileFlow(
      repoPath,
      {
        dryRun: false,
        isTmuxSessionAlive: async () => false
      },
      createDependencies({
        readRuntimeSessionsRegistry: async () => ({
          b_reconcile_01: {
            bubbleId: "b_reconcile_01",
            repoPath,
            worktreePath: missingWorktreePath,
            tmuxSessionName: "pf-b_reconcile_01",
            updatedAt: "2026-03-28T10:00:00.000Z"
          }
        }),
        removeRuntimeSessions: async () => ({
          removedBubbleIds: ["b_reconcile_01"],
          missingBubbleIds: []
        })
      })
    )

    expect(result.actions).toEqual([
      {
        bubbleId: "b_reconcile_01",
        reason: "missing_bubble",
        removed: true
      }
    ])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings?.[0]?.metadata.marker_scope).toBe("worktree")
    await expect(
      stat(resolvePassValidationRecoveryRepoMarkerPath(repoPath, "b_reconcile_01"))
    ).resolves.toBeTruthy()
    await expect(stat(missingWorktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    })
  })

  it("keeps reconcile successful and exposes audit metadata when an existing worktree marker path is blocked", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-reconcile-flow-blocked-"))
    tempDirs.push(repoPath)
    await mkdir(join(repoPath, ".pairflow", "runtime"), { recursive: true })

    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-reconcile-flow-worktree-"))
    tempDirs.push(worktreePath)
    await mkdir(join(worktreePath, ".pairflow"), { recursive: true })
    await mkdir(resolvePassValidationRecoveryWorktreeMarkerPath(worktreePath), {
      recursive: true
    })

    const result = await runReconcileFlow(
      repoPath,
      {
        dryRun: false,
        isTmuxSessionAlive: async () => false
      },
      createDependencies({
        readRuntimeSessionsRegistry: async () => ({
          b_reconcile_02: {
            bubbleId: "b_reconcile_02",
            repoPath,
            worktreePath,
            tmuxSessionName: "pf-b_reconcile_02",
            updatedAt: "2026-03-28T10:00:00.000Z"
          }
        }),
        removeRuntimeSessions: async () => ({
          removedBubbleIds: ["b_reconcile_02"],
          missingBubbleIds: []
        })
      })
    )

    expect(result.actions[0]?.removed).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings?.[0]?.reason_code).toBe(
      "pass_validation_recovery_marker_persist_failed"
    )
    expect(result.warnings?.[0]?.metadata.marker_scope).toBe("worktree")
    expect(result.warnings?.[0]?.metadata.target_path_exists).toBe(true)
    expect(result.warnings?.[0]?.metadata.failed_targets).toContain(
      "worktree:worktree_marker"
    )
    expect(result.warnings?.[0]?.metadata.persisted_targets).toContain(
      "repo:repo_runtime_marker"
    )
  })

  it("does not remove stale runtime sessions when the repo-level recovery marker cannot be persisted", async () => {
    const removeRuntimeSessions = vi.fn(async () => ({
      removedBubbleIds: ["b_reconcile_03"],
      missingBubbleIds: []
    }))

    const result = await runReconcileFlow(
      "/tmp/repo",
      {
        dryRun: false,
        isTmuxSessionAlive: async () => false
      },
      createDependencies({
        readRuntimeSessionsRegistry: async () => ({
          b_reconcile_03: {
            bubbleId: "b_reconcile_03",
            repoPath: "/tmp/repo",
            worktreePath: "/tmp/worktree",
            tmuxSessionName: "pf-b_reconcile_03",
            updatedAt: "2026-03-28T10:00:00.000Z"
          }
        }),
        persistPassValidationRecoveryMarker: async () => ({
          persisted_targets: [],
          warnings: [
            {
              reason_code: "pass_validation_recovery_marker_persist_failed",
              message: "repo marker failed",
              metadata: {
                flow: "reconcile",
                marker_scope: "repo",
                target_path_kind: "repo_runtime_marker",
                target_path_exists: false,
                error_code: "EACCES",
                failed_targets: ["repo:repo_runtime_marker"],
                persisted_targets: [],
                repo_marker_path: "/tmp/repo/.pairflow/runtime/pass-validation-recovery-b_reconcile_03.json",
                worktree_marker_path: "/tmp/worktree/.pairflow/pass-validation-recovery.json",
                worktreePathRequested: true
              }
            }
          ]
        }),
        removeRuntimeSessions
      })
    )

    expect(removeRuntimeSessions).not.toHaveBeenCalled()
    expect(result.actions).toEqual([
      {
        bubbleId: "b_reconcile_03",
        reason: "missing_bubble",
        removed: false,
        removalBlockedByRecoveryMarker: true
      }
    ])
  })

  it("removes only stale sessions whose repo-level recovery marker persisted successfully", async () => {
    const removeRuntimeSessions = vi.fn(async () => ({
      removedBubbleIds: ["b_reconcile_05a"],
      missingBubbleIds: []
    }))

    const result = await runReconcileFlow(
      "/tmp/repo",
      {
        dryRun: false,
        isTmuxSessionAlive: async () => false
      },
      createDependencies({
        readRuntimeSessionsRegistry: async () => ({
          b_reconcile_05a: {
            bubbleId: "b_reconcile_05a",
            repoPath: "/tmp/repo",
            worktreePath: "/tmp/worktree-a",
            tmuxSessionName: "pf-b_reconcile_05a",
            updatedAt: "2026-03-28T10:00:00.000Z"
          },
          b_reconcile_05b: {
            bubbleId: "b_reconcile_05b",
            repoPath: "/tmp/repo",
            worktreePath: "/tmp/worktree-b",
            tmuxSessionName: "pf-b_reconcile_05b",
            updatedAt: "2026-03-28T10:00:00.000Z"
          }
        }),
        persistPassValidationRecoveryMarker: async ({ bubbleId }) =>
          bubbleId === "b_reconcile_05a"
            ? {
                persisted_targets: ["repo:repo_runtime_marker"],
                warnings: []
              }
            : {
                persisted_targets: [],
                warnings: [
                  {
                    reason_code: "pass_validation_recovery_marker_persist_failed",
                    message: "repo marker failed",
                    metadata: {
                      flow: "reconcile",
                      marker_scope: "repo",
                      target_path_kind: "repo_runtime_marker",
                      target_path_exists: false,
                      error_code: "EACCES",
                      failed_targets: ["repo:repo_runtime_marker"],
                      persisted_targets: [],
                      repo_marker_path:
                        "/tmp/repo/.pairflow/runtime/pass-validation-recovery-b_reconcile_05b.json",
                      worktree_marker_path:
                        "/tmp/worktree-b/.pairflow/pass-validation-recovery.json",
                      worktreePathRequested: true
                    }
                  }
                ]
              },
        removeRuntimeSessions
      })
    )

    expect(removeRuntimeSessions).toHaveBeenCalledWith({
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      bubbleIds: ["b_reconcile_05a"]
    })
    expect(result.actions).toEqual([
      {
        bubbleId: "b_reconcile_05a",
        reason: "missing_bubble",
        removed: true
      },
      {
        bubbleId: "b_reconcile_05b",
        reason: "missing_bubble",
        removed: false,
        removalBlockedByRecoveryMarker: true
      }
    ])
  })

  it("does not persist markers or remove sessions during dry-run reconcile", async () => {
    const persistPassValidationRecoveryMarkerMock = vi.fn(async () => ({
      persisted_targets: [],
      warnings: []
    }))
    const removeRuntimeSessions = vi.fn(async () => ({
      removedBubbleIds: [],
      missingBubbleIds: []
    }))

    const result = await runReconcileFlow(
      "/tmp/repo",
      {
        dryRun: true,
        isTmuxSessionAlive: async () => false
      },
      createDependencies({
        readRuntimeSessionsRegistry: async () => ({
          b_reconcile_04: {
            bubbleId: "b_reconcile_04",
            repoPath: "/tmp/repo",
            worktreePath: "/tmp/worktree",
            tmuxSessionName: "pf-b_reconcile_04",
            updatedAt: "2026-03-28T10:00:00.000Z"
          }
        }),
        persistPassValidationRecoveryMarker: persistPassValidationRecoveryMarkerMock,
        removeRuntimeSessions
      })
    )

    expect(result.actions).toEqual([
      {
        bubbleId: "b_reconcile_04",
        reason: "missing_bubble",
        removed: false
      }
    ])
    expect(persistPassValidationRecoveryMarkerMock).not.toHaveBeenCalled()
    expect(removeRuntimeSessions).not.toHaveBeenCalled()
  })
})
