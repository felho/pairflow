import { createHash } from "node:crypto"
import { realpath, stat } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"

import { runGit } from "../../workspace/git.js"
import {
  readPassValidationRecoveryMarker,
  type ReadPassValidationRecoveryMarkerResult
} from "./passValidationRecoveryMarker.js"
import type {
  PassValidationCommandId,
  PassValidationCommandSpec,
  PassValidationEvidenceArtifact,
  PassValidationReuseDecision
} from "./passValidationEvidenceContract.js"

function normalizeCommand(command: string | undefined): string | undefined {
  if (command === undefined) {
    return undefined
  }
  const normalized = command.trim()
  return normalized.length > 0 ? normalized : undefined
}

function isValidTimestamp(value: string | undefined): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function pathStartsWith(path: string, prefix: string): boolean {
  return (
    path === prefix ||
    path.startsWith(`${prefix}/`) ||
    path.startsWith(`${prefix}\\`)
  )
}

async function isTrustedPassValidationLogPath(
  logPath: string | undefined,
  worktreePath: string
): Promise<boolean> {
  const normalized = normalizeCommand(logPath)
  if (
    normalized === undefined ||
    normalized.includes("\u0000") ||
    isAbsolute(normalized)
  ) {
    return false
  }

  if (!normalized.startsWith(".pairflow/evidence/")) {
    return false
  }

  if (normalized.endsWith("/") || normalized.endsWith("\\")) {
    return false
  }

  const resolvedWorktreePath = resolve(worktreePath)
  const resolvedEvidenceRoot = resolve(worktreePath, ".pairflow", "evidence")
  const resolvedLogPath = resolve(worktreePath, normalized)
  if (
    !pathStartsWith(resolvedEvidenceRoot, resolvedWorktreePath) ||
    resolvedLogPath === resolvedEvidenceRoot ||
    !pathStartsWith(resolvedLogPath, resolvedEvidenceRoot)
  ) {
    return false
  }

  const [canonicalWorktreePath, canonicalEvidenceRoot, canonicalLogPath] =
    await Promise.all([
      realpath(resolvedWorktreePath).catch(() => undefined),
      realpath(resolvedEvidenceRoot).catch(() => undefined),
      realpath(resolvedLogPath).catch(() => undefined)
    ])

  if (
    canonicalWorktreePath === undefined ||
    canonicalEvidenceRoot === undefined ||
    canonicalLogPath === undefined
  ) {
    return false
  }

  if (
    !pathStartsWith(canonicalEvidenceRoot, canonicalWorktreePath) ||
    canonicalLogPath === canonicalEvidenceRoot ||
    !pathStartsWith(canonicalLogPath, canonicalEvidenceRoot)
  ) {
    return false
  }

  const logStats = await stat(canonicalLogPath).catch(() => undefined)
  return logStats?.isFile() === true
}

function createPassValidationMismatchDecision(input: {
  detail: string
  requiredCommandSetId: string | null
  recoveryMarkerState: ReadPassValidationRecoveryMarkerResult["state"]
}): PassValidationReuseDecision {
  return {
    reusable: false,
    reason_code: "pass_validation_evidence_mismatch",
    detail: input.detail,
    metadata: {
      recovery_marker_state: input.recoveryMarkerState,
      required_command_set_id: input.requiredCommandSetId
    }
  }
}

function resolvePassValidationArtifactCommand(input: {
  artifact: PassValidationEvidenceArtifact
  kind: PassValidationCommandId
}):
  | {
      entry: PassValidationEvidenceArtifact["commands"][number]
    }
  | {
      error: string
    } {
  const matches = input.artifact.commands.filter((command) => command.kind === input.kind)
  if (matches.length !== 1) {
    return {
      error:
        matches.length === 0
          ? `Canonical PASS validation artifact is missing command '${input.kind}'.`
          : `Canonical PASS validation artifact contains duplicate entries for '${input.kind}'.`
    }
  }

  return {
    entry: matches[0]!
  }
}

function formatGitFingerprintFailureDetail(input: {
  worktreePath: string
  headError?: string
  statusError?: string
}): string {
  const failures = [
    ...(input.headError !== undefined ? [`HEAD: ${input.headError}`] : []),
    ...(input.statusError !== undefined ? [`status: ${input.statusError}`] : [])
  ]
  if (failures.length === 0) {
    return `Unable to read current git fingerprint for ${input.worktreePath}.`
  }
  return `Unable to read current git fingerprint for ${input.worktreePath}: ${failures.join("; ")}.`
}

async function readGitFingerprint(worktreePath: string): Promise<{
  headSha: string | null
  gitStatusHash: string | null
  headError?: string
  statusError?: string
}> {
  const [head, status] = await Promise.all([
    runGit(["rev-parse", "HEAD"], {
      cwd: worktreePath,
      allowFailure: true
    }),
    runGit(["status", "--short"], {
      cwd: worktreePath,
      allowFailure: true
    })
  ])

  return {
    headSha: head.exitCode === 0 ? head.stdout.trim() || null : null,
    gitStatusHash:
      status.exitCode === 0
        ? createHash("sha256").update(status.stdout).digest("hex")
        : null,
    ...(head.exitCode !== 0 ? { headError: head.stderr.trim() || head.stdout.trim() || "git rev-parse HEAD failed" } : {}),
    ...(status.exitCode !== 0
      ? { statusError: status.stderr.trim() || status.stdout.trim() || "git status --short failed" }
      : {})
  }
}

async function evaluateRecoveryMarkerReuse(input: {
  bubbleId: string
  repoPath: string
  worktreePath: string
  requiredCommandSetId: string | null
}):
  Promise<
    | { recoveryMarkerState: "missing" }
    | { mismatch: PassValidationReuseDecision }
  > {
  const recoveryMarker = await readPassValidationRecoveryMarker(
    input.repoPath,
    input.bubbleId,
    input.worktreePath
  )

  if (recoveryMarker.state === "recovery_uncertain") {
    return {
      mismatch: {
        reusable: false,
        reason_code: "pass_validation_evidence_recovery_uncertain",
        detail: recoveryMarker.detail,
        metadata: {
          recovery_marker_state: recoveryMarker.state,
          required_command_set_id: input.requiredCommandSetId
        }
      }
    }
  }

  if (recoveryMarker.state === "valid") {
    return {
      mismatch: createPassValidationMismatchDecision({
        detail: `PASS validation reuse denied because recovery marker exists at ${recoveryMarker.marker_path}.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: recoveryMarker.state
      })
    }
  }

  return {
    recoveryMarkerState: recoveryMarker.state
  }
}

function evaluateArtifactReuseEligibility(input: {
  artifact: PassValidationEvidenceArtifact
  expectedSchemaVersion: number
  bubbleId: string
  requiredCommandSetId: string | null
  recoveryMarkerState: ReadPassValidationRecoveryMarkerResult["state"]
}): PassValidationReuseDecision | undefined {
  const artifactSchemaVersion = (input.artifact as { schema_version?: unknown }).schema_version
  if (artifactSchemaVersion !== input.expectedSchemaVersion) {
    return createPassValidationMismatchDecision({
      detail: `PASS validation artifact schema mismatch: expected ${input.expectedSchemaVersion}, found ${String(artifactSchemaVersion)}.`,
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }

  if (input.artifact.bubble_id !== input.bubbleId) {
    return createPassValidationMismatchDecision({
      detail: `PASS validation artifact bubble mismatch: expected ${input.bubbleId}, found ${input.artifact.bubble_id}.`,
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }

  if (!isValidTimestamp(input.artifact.generated_at)) {
    return createPassValidationMismatchDecision({
      detail: "PASS validation artifact generated_at timestamp is invalid.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }

  if (input.artifact.required_command_set_id !== input.requiredCommandSetId) {
    return createPassValidationMismatchDecision({
      detail: `PASS validation artifact required command set mismatch: expected ${input.requiredCommandSetId ?? "null"}, found ${input.artifact.required_command_set_id ?? "null"}.`,
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }

  if (input.artifact.trust_level !== "trusted") {
    return createPassValidationMismatchDecision({
      detail: "PASS validation artifact is not trusted for reuse.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }

  if (input.artifact.head_sha === null || input.artifact.git_status_hash === null) {
    return createPassValidationMismatchDecision({
      detail:
        "PASS validation artifact is missing fingerprint fields required for trusted reuse.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }
}

async function evaluateCurrentFingerprintReuse(input: {
  artifact: PassValidationEvidenceArtifact
  worktreePath: string
  requiredCommandSetId: string | null
  recoveryMarkerState: ReadPassValidationRecoveryMarkerResult["state"]
}): Promise<PassValidationReuseDecision | undefined> {
  const currentFingerprint = await readGitFingerprint(input.worktreePath)
  if (currentFingerprint.headSha === null || currentFingerprint.gitStatusHash === null) {
    return createPassValidationMismatchDecision({
      detail: formatGitFingerprintFailureDetail({
        worktreePath: input.worktreePath,
        ...(currentFingerprint.headError !== undefined
          ? { headError: currentFingerprint.headError }
          : {}),
        ...(currentFingerprint.statusError !== undefined
          ? { statusError: currentFingerprint.statusError }
          : {})
      }),
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }

  if (
    currentFingerprint.headSha !== input.artifact.head_sha ||
    currentFingerprint.gitStatusHash !== input.artifact.git_status_hash
  ) {
    return createPassValidationMismatchDecision({
      detail: "PASS validation artifact fingerprint no longer matches the current worktree state.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: input.recoveryMarkerState
    })
  }
}

async function evaluateRequiredCommandReuse(input: {
  artifact: PassValidationEvidenceArtifact
  requiredCommands: PassValidationCommandSpec[]
  worktreePath: string
  requiredCommandSetId: string | null
  recoveryMarkerState: ReadPassValidationRecoveryMarkerResult["state"]
}): Promise<PassValidationReuseDecision | undefined> {
  for (const requiredCommand of input.requiredCommands) {
    const resolved = resolvePassValidationArtifactCommand({
      artifact: input.artifact,
      kind: requiredCommand.kind
    })
    if ("error" in resolved) {
      return createPassValidationMismatchDecision({
        detail: resolved.error,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: input.recoveryMarkerState
      })
    }

    const artifactCommand = resolved.entry
    if (normalizeCommand(artifactCommand.command) !== normalizeCommand(requiredCommand.command)) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact command mismatch for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: input.recoveryMarkerState
      })
    }

    if (!Number.isInteger(artifactCommand.exit_code)) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact recorded an invalid exit code for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: input.recoveryMarkerState
      })
    }

    if (artifactCommand.exit_code !== 0) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact recorded non-zero exit for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: input.recoveryMarkerState
      })
    }

    if (!(await isTrustedPassValidationLogPath(artifactCommand.log_path, input.worktreePath))) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact recorded an untrusted log path for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: input.recoveryMarkerState
      })
    }
  }
}

export async function evaluatePassValidationEvidenceReuse(input: {
  artifact: PassValidationEvidenceArtifact
  bubbleId: string
  repoPath: string
  worktreePath: string
  requiredCommandSetId: string | null
  requiredCommands: PassValidationCommandSpec[]
  expectedSchemaVersion: number
}): Promise<PassValidationReuseDecision> {
  const recovery = await evaluateRecoveryMarkerReuse({
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    worktreePath: input.worktreePath,
    requiredCommandSetId: input.requiredCommandSetId
  })
  if ("mismatch" in recovery) {
    return recovery.mismatch
  }

  const artifactMismatch = evaluateArtifactReuseEligibility({
    artifact: input.artifact,
    expectedSchemaVersion: input.expectedSchemaVersion,
    bubbleId: input.bubbleId,
    requiredCommandSetId: input.requiredCommandSetId,
    recoveryMarkerState: recovery.recoveryMarkerState
  })
  if (artifactMismatch !== undefined) {
    return artifactMismatch
  }

  const fingerprintMismatch = await evaluateCurrentFingerprintReuse({
    artifact: input.artifact,
    worktreePath: input.worktreePath,
    requiredCommandSetId: input.requiredCommandSetId,
    recoveryMarkerState: recovery.recoveryMarkerState
  })
  if (fingerprintMismatch !== undefined) {
    return fingerprintMismatch
  }

  const commandMismatch = await evaluateRequiredCommandReuse({
    artifact: input.artifact,
    requiredCommands: input.requiredCommands,
    worktreePath: input.worktreePath,
    requiredCommandSetId: input.requiredCommandSetId,
    recoveryMarkerState: recovery.recoveryMarkerState
  })
  if (commandMismatch !== undefined) {
    return commandMismatch
  }

  return {
    reusable: true,
    detail: "Canonical PASS validation artifact remains eligible for trusted reuse.",
    metadata: {
      recovery_marker_state: recovery.recoveryMarkerState,
      required_command_set_id: input.requiredCommandSetId
    }
  }
}
