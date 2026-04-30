import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import type { ReviewerTestExecutionDirective } from "../../../../v11/shared/reviewer/testEvidence.js"
import { runGit } from "../../workspace/git.js"
import type { BubbleConfig } from "../../../../types/bubble.js"
import { isValidationCommandId } from "../../../shared/validation/validationCommandId.js"
import {
  passValidationEvidenceSchemaVersion,
  type PassValidationCommandId,
  type PassValidationCommandResult,
  type PassValidationCommandSpec,
  type PassValidationEvidenceArtifact,
  type PassValidationPolicyState,
  type PassValidationReviewerCompatibilityArtifact,
  type PassValidationReuseDecision
} from "./passValidationEvidenceContract.js"

export {
  passValidationEvidenceSchemaVersion,
  type PassValidationCommandId,
  type PassValidationCommandResult,
  type PassValidationCommandSpec,
  type PassValidationEvidenceArtifact,
  type PassValidationPolicyState,
  type PassValidationReviewerCompatibilityArtifact,
  type PassValidationReuseDecision
} from "./passValidationEvidenceContract.js"

export type {
  PassValidationRecoveryMarkerPersistWarning,
  PassValidationRecoveryMarkerPersistWarningMetadata,
  PersistPassValidationRecoveryMarkerInput,
  PersistPassValidationRecoveryMarkerPort,
  PersistPassValidationRecoveryMarkerResult
} from "../../../shared/ports/passValidationRecovery.js"
export {
  passValidationRecoveryMarkerSchemaVersion,
  persistPassValidationRecoveryMarker,
  readPassValidationRecoveryMarker,
  resolvePassValidationRecoveryRepoMarkerPath,
  resolvePassValidationRecoveryWorktreeMarkerPath,
  type PassValidationRecoveryMarker,
  type PassValidationRecoverySource,
  type ReadPassValidationRecoveryMarkerResult
} from "./passValidationRecoveryMarker.js"
import { evaluatePassValidationEvidenceReuse as evaluatePassValidationEvidenceReuseRuntime } from "./passValidationEvidenceReuse.js"

export interface ResolvedPassValidationPolicy {
  policyState: PassValidationPolicyState
  commands: PassValidationCommandSpec[]
  requiredCommandSetId: string | null
  invalidReason?: string
}

function normalizeCommand(command: string | undefined): string | undefined {
  if (command === undefined) {
    return undefined
  }
  const normalized = command.trim()
  return normalized.length > 0 ? normalized : undefined
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
    if (!isValidationCommandId(rawId)) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: validationRequired.join("__"),
        invalidReason: `commands.validation_required references unsupported id '${rawId}'.`
      }
    }
    if (seenRequiredIds.has(rawId)) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: validationRequired.join("__"),
        invalidReason: `commands.validation_required contains duplicate id '${rawId}'.`
      }
    }
    const commandCandidate = bubbleConfig.commands[rawId]

    const resolvedCommand =
      typeof commandCandidate === "string"
        ? normalizeCommand(commandCandidate)
        : undefined
    if (resolvedCommand === undefined) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: validationRequired.join("__"),
        invalidReason: `commands.${rawId} is missing or empty for configured PASS validation.`
      }
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

export async function evaluatePassValidationEvidenceReuse(input: {
  artifact: PassValidationEvidenceArtifact
  bubbleId: string
  repoPath: string
  worktreePath: string
  requiredCommandSetId: string | null
  requiredCommands: PassValidationCommandSpec[]
}): Promise<PassValidationReuseDecision> {
  return evaluatePassValidationEvidenceReuseRuntime({
    ...input,
    expectedSchemaVersion: passValidationEvidenceSchemaVersion
  })
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
