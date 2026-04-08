import { constants as fsConstants } from "node:fs"
import { access, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

import type {
  PersistPassValidationRecoveryMarkerInput,
  PersistPassValidationRecoveryMarkerPort,
  PersistPassValidationRecoveryMarkerResult
} from "../../../shared/ports/passValidationRecovery.js"

export const passValidationRecoveryMarkerSchemaVersion = 1 as const

export type PassValidationRecoverySource = "restart" | "reconcile"

export interface PassValidationRecoveryMarker {
  schema_version: typeof passValidationRecoveryMarkerSchemaVersion
  bubble_id: string
  flow: PassValidationRecoverySource
  occurred_at: string
  repo_path: string
  worktree_path?: string
}

export type ReadPassValidationRecoveryMarkerResult =
  | {
      state: "missing"
    }
  | {
      state: "valid"
      marker: PassValidationRecoveryMarker
      marker_path: string
      marker_scope: "repo" | "worktree"
    }
  | {
      state: "recovery_uncertain"
      reason_code: "pass_validation_evidence_recovery_uncertain"
      detail: string
      marker_path: string
      marker_scope: "repo" | "worktree"
    }

type RecoveryUncertainResult = Extract<
  ReadPassValidationRecoveryMarkerResult,
  { state: "recovery_uncertain" }
>

interface RecoveryMarkerCandidatePath {
  marker_scope: "repo" | "worktree"
  marker_path: string
}

interface RecoveryMarkerTargetFailure {
  marker_scope: "repo" | "worktree"
  target_path_kind: "repo_runtime_marker" | "worktree_marker"
  target_path_exists: boolean
  target_path: string
  message: string
  error_code?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidTimestamp(value: string | undefined): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

async function pathExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return false
      }
      throw error
    })
}

function parsePassValidationRecoveryMarker(input: {
  raw: string
  bubbleId: string
  markerPath: string
}):
  | {
      marker: PassValidationRecoveryMarker
    }
  | {
      detail: string
    } {
  let parsed: unknown
  try {
    parsed = JSON.parse(input.raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      detail: `Recovery marker JSON parse failed at ${input.markerPath}: ${message}`
    }
  }

  if (!isRecord(parsed)) {
    return {
      detail: `Recovery marker at ${input.markerPath} must be a JSON object.`
    }
  }

  if (parsed.schema_version !== passValidationRecoveryMarkerSchemaVersion) {
    return {
      detail: `Recovery marker at ${input.markerPath} has unsupported schema version '${String(parsed.schema_version)}'.`
    }
  }

  if (parsed.bubble_id !== input.bubbleId) {
    return {
      detail: `Recovery marker at ${input.markerPath} does not match bubble ${input.bubbleId}.`
    }
  }

  if (parsed.flow !== "restart" && parsed.flow !== "reconcile") {
    return {
      detail: `Recovery marker at ${input.markerPath} has invalid flow '${String(parsed.flow)}'.`
    }
  }

  const occurredAt =
    typeof parsed.occurred_at === "string" ? parsed.occurred_at : undefined
  if (!isValidTimestamp(occurredAt)) {
    return {
      detail: `Recovery marker at ${input.markerPath} has invalid occurred_at timestamp.`
    }
  }

  const repoPath =
    typeof parsed.repo_path === "string" && parsed.repo_path.trim().length > 0
      ? parsed.repo_path
      : undefined
  if (repoPath === undefined) {
    return {
      detail: `Recovery marker at ${input.markerPath} is missing repo_path.`
    }
  }

  const worktreePath =
    typeof parsed.worktree_path === "string" && parsed.worktree_path.trim().length > 0
      ? parsed.worktree_path
      : undefined

  return {
    marker: {
      schema_version: passValidationRecoveryMarkerSchemaVersion,
      bubble_id: input.bubbleId,
      flow: parsed.flow,
      occurred_at: occurredAt,
      repo_path: repoPath,
      ...(worktreePath !== undefined ? { worktree_path: worktreePath } : {})
    }
  }
}

function createRecoveryUncertainResult(input: {
  detail: string
  candidate: RecoveryMarkerCandidatePath
}): RecoveryUncertainResult {
  return {
    state: "recovery_uncertain",
    reason_code: "pass_validation_evidence_recovery_uncertain",
    detail: input.detail,
    marker_path: input.candidate.marker_path,
    marker_scope: input.candidate.marker_scope
  }
}

async function readRecoveryMarkerCandidate(input: {
  bubbleId: string
  candidate: RecoveryMarkerCandidatePath
}): Promise<ReadPassValidationRecoveryMarkerResult> {
  const raw = await readFile(input.candidate.marker_path, "utf8").catch((error: unknown) => {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return {
        missing: true as const
      }
    }
    const message = error instanceof Error ? error.message : String(error)
    return {
      error: `Recovery marker read failed at ${input.candidate.marker_path}: ${message}`
    }
  })
  if (typeof raw === "object" && raw !== null && "missing" in raw) {
    return {
      state: "missing"
    }
  }
  if (typeof raw !== "string") {
    return createRecoveryUncertainResult({
      detail: raw.error,
      candidate: input.candidate
    })
  }

  const parsed = parsePassValidationRecoveryMarker({
    raw,
    bubbleId: input.bubbleId,
    markerPath: input.candidate.marker_path
  })
  if ("detail" in parsed) {
    return createRecoveryUncertainResult({
      detail: parsed.detail,
      candidate: input.candidate
    })
  }

  return {
    state: "valid",
    marker: parsed.marker,
    marker_path: input.candidate.marker_path,
    marker_scope: input.candidate.marker_scope
  }
}

async function persistRecoveryMarkerTarget(input: {
  marker_scope: "repo" | "worktree"
  target_path_kind: "repo_runtime_marker" | "worktree_marker"
  target_path: string
  serializedMarker: string
}): Promise<{ persisted: boolean } | { failure: RecoveryMarkerTargetFailure }> {
  const targetPathExists = await pathExists(input.target_path)
  const targetParentExists = await pathExists(dirname(input.target_path))
  if (!targetParentExists) {
    return {
      failure: {
        marker_scope: input.marker_scope,
        target_path_kind: input.target_path_kind,
        target_path_exists: targetPathExists,
        target_path: input.target_path,
        message:
          `Skipped ${input.marker_scope} recovery marker write because the existing marker parent path is unavailable.`
      }
    }
  }

  return writeFile(input.target_path, input.serializedMarker, "utf8")
    .then(() => ({ persisted: true as const }))
    .catch((error: unknown) => {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
          ? error.code
          : undefined
      return {
        failure: {
          marker_scope: input.marker_scope,
          target_path_kind: input.target_path_kind,
          target_path_exists: targetPathExists,
          target_path: input.target_path,
          message: error instanceof Error ? error.message : String(error),
          ...(errorCode !== undefined ? { error_code: errorCode } : {})
        }
      }
    })
}

function formatCombinedRecoveryUncertainDetail(
  uncertainResults: RecoveryUncertainResult[]
): string {
  return uncertainResults
    .map((result) => {
      const scopePrefix = result.marker_scope === "repo" ? "repo" : "worktree"
      return `[${scopePrefix}] ${result.detail}`
    })
    .join(" | ")
}

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
