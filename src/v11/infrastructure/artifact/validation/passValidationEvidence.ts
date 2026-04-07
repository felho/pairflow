import { createHash } from "node:crypto"
import { constants as fsConstants } from "node:fs"
import { access, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"

import type { ReviewerTestExecutionDirective } from "../../../../v11/shared/reviewer/testEvidence.js"
import { runGit } from "../../workspace/git.js"
import type { BubbleConfig } from "../../../../types/bubble.js"

export const passValidationEvidenceSchemaVersion = 1 as const
export const passValidationRecoveryMarkerSchemaVersion = 1 as const

export const passValidationCommandIds = ["lint", "typecheck", "test"] as const

export type PassValidationCommandId = (typeof passValidationCommandIds)[number]

export type PassValidationPolicyState =
  | "policy_missing"
  | "policy_configured"
  | "policy_explicit_null"

export interface PassValidationCommandSpec {
  kind: PassValidationCommandId
  command: string
}

export interface PassValidationCommandResult {
  kind: PassValidationCommandId
  command: string
  exitCode: number
  logPath: string
  durationMs: number
}

export interface PassValidationEvidenceArtifact {
  schema_version: typeof passValidationEvidenceSchemaVersion
  bubble_id: string
  round: number
  generated_at: string
  head_sha: string | null
  git_status_hash: string | null
  policy_state: PassValidationPolicyState
  commands: Array<{
    kind: PassValidationCommandId
    command: string
    exit_code?: number
    log_path?: string
    duration_ms?: number
  }>
  required_command_set_id: string | null
  trust_level: "trusted" | "untrusted"
  trust_reason_code: "no_trigger" | "pass_validation_policy_missing"
}

export interface PassValidationReviewerCompatibilityArtifact {
  verification_status: ReviewerTestExecutionDirective["verification_status"]
  skip_full_rerun: boolean
  reason_code: ReviewerTestExecutionDirective["reason_code"]
  reason_detail: string
  status: "trusted" | "untrusted" | "missing"
  decision: "skip_full_rerun" | "run_checks"
}

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

export interface PassValidationReuseDecision {
  reusable: boolean
  reason_code?: "pass_validation_evidence_mismatch" | "pass_validation_evidence_recovery_uncertain"
  detail: string
  metadata: {
    recovery_marker_state: ReadPassValidationRecoveryMarkerResult["state"]
    required_command_set_id: string | null
  }
}
import type {
  PersistPassValidationRecoveryMarkerInput,
  PersistPassValidationRecoveryMarkerPort,
  PersistPassValidationRecoveryMarkerResult
} from "../../../shared/ports/passValidationRecovery.js"

export type {
  PassValidationRecoveryMarkerPersistWarning,
  PassValidationRecoveryMarkerPersistWarningMetadata,
  PersistPassValidationRecoveryMarkerInput,
  PersistPassValidationRecoveryMarkerPort,
  PersistPassValidationRecoveryMarkerResult
} from "../../../shared/ports/passValidationRecovery.js"

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

export interface ResolvedPassValidationPolicy {
  policyState: PassValidationPolicyState
  commands: PassValidationCommandSpec[]
  requiredCommandSetId: string | null
  invalidReason?: string
}

function isPassValidationCommandId(value: string): value is PassValidationCommandId {
  return (passValidationCommandIds as readonly string[]).includes(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

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

function mapDirectiveStatus(
  verificationStatus: ReviewerTestExecutionDirective["verification_status"]
): "trusted" | "untrusted" | "missing" {
  if (verificationStatus === "trusted") {
    return "trusted"
  }
  if (verificationStatus === "missing") {
    return "missing"
  }
  return "untrusted"
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

export function resolvePassValidationArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "pass-validation-evidence.json")
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

export function resolvePassValidationReviewerCompatibilityArtifactPath(
  artifactsDir: string
): string {
  return join(artifactsDir, "pass-validation-reviewer-compatibility.json")
}

export function resolvePassValidationPolicy(
  bubbleConfig: BubbleConfig
): ResolvedPassValidationPolicy {
  const validationRequired = bubbleConfig.commands.validation_required

  if (validationRequired === undefined) {
    return {
      policyState: "policy_missing",
      commands: [],
      requiredCommandSetId: null
    }
  }

  if (validationRequired.length === 0) {
    if (bubbleConfig.commands.validation_required_explicit === true) {
      return {
        policyState: "policy_explicit_null",
        commands: [],
        requiredCommandSetId: "explicit-null"
      }
    }

    return {
      policyState: "policy_configured",
      commands: [],
      requiredCommandSetId: "configured-empty",
      invalidReason:
        "commands.validation_required=[] is only valid when commands.validation_required_explicit=true."
    }
  }

  const resolvedCommands: PassValidationCommandSpec[] = []
  const orderedRequiredIds: PassValidationCommandId[] = []
  const seenRequiredIds = new Set<PassValidationCommandId>()
  for (const rawId of validationRequired) {
    if (!isPassValidationCommandId(rawId)) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: validationRequired.join("__"),
        invalidReason: `commands.validation_required references unsupported id '${rawId}'.`
      }
    }

    const resolvedCommand = normalizeCommand(bubbleConfig.commands[rawId])
    if (resolvedCommand === undefined) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: validationRequired.join("__"),
        invalidReason: `commands.${rawId} is missing or empty for configured PASS validation.`
      }
    }

    if (seenRequiredIds.has(rawId)) {
      continue
    }
    seenRequiredIds.add(rawId)
    orderedRequiredIds.push(rawId)

    resolvedCommands.push({
      kind: rawId,
      command: resolvedCommand
    })
  }

  return {
    policyState: "policy_configured",
    commands: resolvedCommands,
    requiredCommandSetId: orderedRequiredIds.join("__")
  }
}

export async function buildPassValidationEvidenceArtifact(input: {
  bubbleId: string
  round: number
  generatedAt: string
  worktreePath: string
  policyState: PassValidationPolicyState
  requiredCommandSetId: string | null
  trustLevel: "trusted" | "untrusted"
  trustReasonCode: "no_trigger" | "pass_validation_policy_missing"
  commands: Array<PassValidationCommandSpec | PassValidationCommandResult>
}): Promise<PassValidationEvidenceArtifact> {
  const fingerprint = await readGitFingerprint(input.worktreePath)

  return {
    schema_version: passValidationEvidenceSchemaVersion,
    bubble_id: input.bubbleId,
    round: input.round,
    generated_at: input.generatedAt,
    head_sha: fingerprint.headSha,
    git_status_hash: fingerprint.gitStatusHash,
    policy_state: input.policyState,
    commands: input.commands.map((command) => ({
      kind: command.kind,
      command: command.command,
      ...("exitCode" in command
        ? {
            exit_code: command.exitCode,
            log_path: command.logPath,
            duration_ms: command.durationMs
          }
        : {})
    })),
    required_command_set_id: input.requiredCommandSetId,
    trust_level: input.trustLevel,
    trust_reason_code: input.trustReasonCode
  }
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

export async function evaluatePassValidationEvidenceReuse(input: {
  artifact: PassValidationEvidenceArtifact
  bubbleId: string
  repoPath: string
  worktreePath: string
  requiredCommandSetId: string | null
  requiredCommands: PassValidationCommandSpec[]
}): Promise<PassValidationReuseDecision> {
  const artifactSchemaVersion = (input.artifact as { schema_version?: unknown }).schema_version
  const recoveryMarker = await readPassValidationRecoveryMarker(
    input.repoPath,
    input.bubbleId,
    input.worktreePath
  )

  if (recoveryMarker.state === "recovery_uncertain") {
    return {
      reusable: false,
      reason_code: "pass_validation_evidence_recovery_uncertain",
      detail: recoveryMarker.detail,
      metadata: {
        recovery_marker_state: recoveryMarker.state,
        required_command_set_id: input.requiredCommandSetId
      }
    }
  }

  if (recoveryMarker.state === "valid") {
    return createPassValidationMismatchDecision({
      detail: `PASS validation reuse denied because recovery marker exists at ${recoveryMarker.marker_path}.`,
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

  if (artifactSchemaVersion !== passValidationEvidenceSchemaVersion) {
    return createPassValidationMismatchDecision({
      detail: `PASS validation artifact schema mismatch: expected ${passValidationEvidenceSchemaVersion}, found ${String(artifactSchemaVersion)}.`,
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

  if (input.artifact.bubble_id !== input.bubbleId) {
    return createPassValidationMismatchDecision({
      detail: `PASS validation artifact bubble mismatch: expected ${input.bubbleId}, found ${input.artifact.bubble_id}.`,
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

  if (!isValidTimestamp(input.artifact.generated_at)) {
    return createPassValidationMismatchDecision({
      detail: "PASS validation artifact generated_at timestamp is invalid.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

  if (input.artifact.required_command_set_id !== input.requiredCommandSetId) {
    return createPassValidationMismatchDecision({
      detail: `PASS validation artifact required command set mismatch: expected ${input.requiredCommandSetId ?? "null"}, found ${input.artifact.required_command_set_id ?? "null"}.`,
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

  if (input.artifact.trust_level !== "trusted") {
    return createPassValidationMismatchDecision({
      detail: "PASS validation artifact is not trusted for reuse.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

  if (input.artifact.head_sha === null || input.artifact.git_status_hash === null) {
    return createPassValidationMismatchDecision({
      detail:
        "PASS validation artifact is missing fingerprint fields required for trusted reuse.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

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
      recoveryMarkerState: recoveryMarker.state
    })
  }

  if (
    currentFingerprint.headSha !== input.artifact.head_sha ||
    currentFingerprint.gitStatusHash !== input.artifact.git_status_hash
  ) {
    return createPassValidationMismatchDecision({
      detail: "PASS validation artifact fingerprint no longer matches the current worktree state.",
      requiredCommandSetId: input.requiredCommandSetId,
      recoveryMarkerState: recoveryMarker.state
    })
  }

  for (const requiredCommand of input.requiredCommands) {
    const resolved = resolvePassValidationArtifactCommand({
      artifact: input.artifact,
      kind: requiredCommand.kind
    })
    if ("error" in resolved) {
      return createPassValidationMismatchDecision({
        detail: resolved.error,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: recoveryMarker.state
      })
    }

    const artifactCommand = resolved.entry
    if (normalizeCommand(artifactCommand.command) !== normalizeCommand(requiredCommand.command)) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact command mismatch for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: recoveryMarker.state
      })
    }

    if (!Number.isInteger(artifactCommand.exit_code)) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact recorded an invalid exit code for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: recoveryMarker.state
      })
    }

    if (artifactCommand.exit_code !== 0) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact recorded non-zero exit for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: recoveryMarker.state
      })
    }

    if (!(await isTrustedPassValidationLogPath(artifactCommand.log_path, input.worktreePath))) {
      return createPassValidationMismatchDecision({
        detail: `Canonical PASS validation artifact recorded an untrusted log path for '${requiredCommand.kind}'.`,
        requiredCommandSetId: input.requiredCommandSetId,
        recoveryMarkerState: recoveryMarker.state
      })
    }
  }

  return {
    reusable: true,
    detail: "Canonical PASS validation artifact remains eligible for trusted reuse.",
    metadata: {
      recovery_marker_state: recoveryMarker.state,
      required_command_set_id: input.requiredCommandSetId
    }
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

export function createPassValidationReviewerDirective(input: {
  policyState: PassValidationPolicyState
  executedCommands: PassValidationCommandResult[]
}): ReviewerTestExecutionDirective {
  if (input.policyState === "policy_missing") {
    return {
      skip_full_rerun: false,
      reason_code: "pass_validation_policy_missing",
      reason_detail:
        "PASS validation policy is not configured in bubble [commands]; reviewer must run checks.",
      verification_status: "untrusted"
    }
  }

  if (input.policyState === "policy_explicit_null") {
    return {
      skip_full_rerun: true,
      reason_code: "no_trigger",
      reason_detail:
        "PASS validation policy explicitly disables required commands for this bubble.",
      verification_status: "trusted"
    }
  }

  const executedKinds = input.executedCommands.map((command) => command.kind).join(", ")
  return {
    skip_full_rerun: true,
    reason_code: "no_trigger",
    reason_detail:
      executedKinds.length > 0
        ? `PASS validation completed successfully for required commands: ${executedKinds}.`
        : "PASS validation completed successfully.",
    verification_status: "trusted"
  }
}

export async function writePassValidationEvidenceArtifact(
  artifactPath: string,
  artifact: PassValidationEvidenceArtifact
): Promise<void> {
  await mkdir(dirname(artifactPath), { recursive: true })
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")
}

export async function writePassValidationReviewerCompatibilityArtifact(
  artifactPath: string,
  directive: ReviewerTestExecutionDirective
): Promise<void> {
  const artifact: PassValidationReviewerCompatibilityArtifact = {
    verification_status: directive.verification_status,
    skip_full_rerun: directive.skip_full_rerun,
    reason_code: directive.reason_code,
    reason_detail: directive.reason_detail,
    status: mapDirectiveStatus(directive.verification_status),
    decision: directive.skip_full_rerun ? "skip_full_rerun" : "run_checks"
  }

  await mkdir(dirname(artifactPath), { recursive: true })
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")
}
