import { join, resolve } from "node:path"

import type {
  PersistPassValidationRecoveryMarkerInput,
  PersistPassValidationRecoveryMarkerPort,
  PersistPassValidationRecoveryMarkerResult
} from "../../../ports/passValidationRecovery.js"
import {
  formatCombinedRecoveryUncertainDetail,
  persistRecoveryMarkerTarget,
  readRecoveryMarkerCandidate,
  type RecoveryMarkerCandidatePath,
  type RecoveryMarkerTargetFailure
} from "./passValidationRecoveryMarkerSupport.js"
import {
  passValidationRecoveryMarkerSchemaVersion,
  type PassValidationRecoveryMarker,
  type ReadPassValidationRecoveryMarkerResult,
  type RecoveryUncertainResult
} from "./passValidationRecoveryMarkerTypes.js"

export { passValidationRecoveryMarkerSchemaVersion } from "./passValidationRecoveryMarkerTypes.js"
export type {
  PassValidationRecoveryMarker,
  PassValidationRecoverySource,
  ReadPassValidationRecoveryMarkerResult
} from "./passValidationRecoveryMarkerTypes.js"

export function resolvePassValidationRecoveryRepoMarkerPath(
  repoPath: string,
  bubbleId: string
): string {
  return join(
    repoPath,
    ".pairflow",
    "runtime",
    `pass-validation-recovery-${bubbleId}.json`
  )
}

export function resolvePassValidationRecoveryWorktreeMarkerPath(
  worktreePath: string
): string {
  return join(worktreePath, ".pairflow", "pass-validation-recovery.json")
}

export async function readPassValidationRecoveryMarker(
  repoPath: string,
  bubbleId: string,
  worktreePath?: string
): Promise<ReadPassValidationRecoveryMarkerResult> {
  const repoCandidate: RecoveryMarkerCandidatePath = {
    marker_scope: "repo",
    marker_path: resolvePassValidationRecoveryRepoMarkerPath(repoPath, bubbleId)
  }
  const repoResult = await readRecoveryMarkerCandidate({
    bubbleId,
    candidate: repoCandidate
  })
  if (repoResult.state === "valid") {
    return repoResult
  }

  const worktreeCandidate =
    worktreePath !== undefined
      ? {
          marker_scope: "worktree" as const,
          marker_path: resolvePassValidationRecoveryWorktreeMarkerPath(worktreePath)
        }
      : undefined
  const worktreeResult =
    worktreeCandidate !== undefined
      ? await readRecoveryMarkerCandidate({
          bubbleId,
          candidate: worktreeCandidate
        })
      : undefined

  if (repoResult.state === "recovery_uncertain") {
    const uncertainResults: RecoveryUncertainResult[] =
      worktreeResult !== undefined && worktreeResult.state === "recovery_uncertain"
        ? [repoResult, worktreeResult]
        : [repoResult]
    return {
      ...repoResult,
      detail: formatCombinedRecoveryUncertainDetail(uncertainResults)
    }
  }

  if (worktreeResult?.state === "valid") {
    return worktreeResult
  }

  if (worktreeResult?.state === "recovery_uncertain") {
    return worktreeResult
  }

  return {
    state: "missing"
  }
}

export const persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort = async (
  input: PersistPassValidationRecoveryMarkerInput
): Promise<PersistPassValidationRecoveryMarkerResult> => {
  const occurredAt = (input.now ?? new Date()).toISOString()
  const repoMarkerPath = resolvePassValidationRecoveryRepoMarkerPath(
    input.repoPath,
    input.bubbleId
  )
  const worktreeMarkerPath =
    input.worktreePath !== undefined
      ? resolvePassValidationRecoveryWorktreeMarkerPath(input.worktreePath)
      : undefined

  const marker: PassValidationRecoveryMarker = {
    schema_version: passValidationRecoveryMarkerSchemaVersion,
    bubble_id: input.bubbleId,
    flow: input.flow,
    occurred_at: occurredAt,
    repo_path: resolve(input.repoPath),
    ...(input.worktreePath !== undefined
      ? { worktree_path: resolve(input.worktreePath) }
      : {})
  }

  const serializedMarker = `${JSON.stringify(marker, null, 2)}\n`
  const persistedTargets: string[] = []
  const failedTargets: RecoveryMarkerTargetFailure[] = []

  const repoPersistResult = await persistRecoveryMarkerTarget({
    marker_scope: "repo",
    target_path_kind: "repo_runtime_marker",
    target_path: repoMarkerPath,
    serializedMarker
  })
  if ("persisted" in repoPersistResult) {
    persistedTargets.push("repo:repo_runtime_marker")
  } else {
    failedTargets.push(repoPersistResult.failure)
  }

  if (worktreeMarkerPath !== undefined) {
    const worktreePersistResult = await persistRecoveryMarkerTarget({
      marker_scope: "worktree",
      target_path_kind: "worktree_marker",
      target_path: worktreeMarkerPath,
      serializedMarker
    })
    if ("persisted" in worktreePersistResult) {
      persistedTargets.push("worktree:worktree_marker")
    } else {
      failedTargets.push(worktreePersistResult.failure)
    }
  }

  const failedTargetIds = failedTargets.map(
    (target) => `${target.marker_scope}:${target.target_path_kind}`
  )
  return {
    persisted_targets: persistedTargets,
    warnings: failedTargets.map((target) => ({
      reason_code: "pass_validation_recovery_marker_persist_failed",
      message: `Failed to persist PASS validation recovery marker for ${input.flow} (${target.marker_scope}) at ${target.target_path}: ${target.message}`,
      metadata: {
        flow: input.flow,
        marker_scope: target.marker_scope,
        target_path_kind: target.target_path_kind,
        target_path_exists: target.target_path_exists,
        ...(target.error_code !== undefined ? { error_code: target.error_code } : {}),
        failed_targets: failedTargetIds,
        persisted_targets: [...persistedTargets],
        repo_marker_path: repoMarkerPath,
        ...(worktreeMarkerPath !== undefined
          ? { worktree_marker_path: worktreeMarkerPath }
          : {}),
        worktreePathRequested: input.worktreePath !== undefined
      }
    }))
  }
}
