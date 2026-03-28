import type { ReviewerTestExecutionDirective } from "../../../core/reviewer/testEvidence.js"
import {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath,
  resolvePassValidationPolicy,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact,
  type PassValidationCommandResult
} from "../../../core/runtime/passValidationEvidence.js"
import {
  runPassValidationCommand,
  PassValidationRunnerExecutionError
} from "../../../core/runtime/passValidationRunner.js"
import type { BubbleConfig } from "../../../types/bubble.js"

export interface ResolvePassValidationForPassInput {
  senderRole: "implementer" | "reviewer"
  bubbleId: string
  bubbleConfig: BubbleConfig
  worktreePath: string
  artifactsDir: string
  round: number
  now: Date
  createError: PairflowCreateCommandError
}

export interface ResolvePassValidationForPassDependencies {
  resolvePassValidationPolicy?: typeof resolvePassValidationPolicy
  runPassValidationCommand?: typeof runPassValidationCommand
  buildPassValidationEvidenceArtifact?: typeof buildPassValidationEvidenceArtifact
  writePassValidationEvidenceArtifact?: typeof writePassValidationEvidenceArtifact
  writePassValidationReviewerCompatibilityArtifact?:
    typeof writePassValidationReviewerCompatibilityArtifact
}

export interface ResolvePassValidationForPassResult {
  reviewerTestDirective?: ReviewerTestExecutionDirective
  validationRefs: string[]
  compatibilityArtifactWriteFailureReason?: string
}

function toFailureReason(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : String(error)
}

function buildCompatibilityWriteFailureReason(error: unknown): string {
  return `pass_validation_reviewer_compat_artifact_persist_failed: ${toFailureReason(error)}`
}

function throwPassValidationFailure(
  createError: PairflowCreateCommandError,
  reasonCode:
    | "pass_validation_command_missing"
    | "pass_validation_command_failed"
    | "pass_validation_execution_error"
    | "pass_validation_artifact_persist_failed",
  message: string
): never {
  throw createError({
    reasonCode,
    message
  })
}

export async function resolvePassValidationForPass(
  input: ResolvePassValidationForPassInput,
  dependencies: ResolvePassValidationForPassDependencies = {}
): Promise<ResolvePassValidationForPassResult> {
  if (
    input.senderRole !== "implementer" ||
    input.bubbleConfig.review_artifact_type !== "code"
  ) {
    return {
      validationRefs: []
    }
  }

  const resolvePolicy =
    dependencies.resolvePassValidationPolicy ?? resolvePassValidationPolicy
  const runValidationCommand =
    dependencies.runPassValidationCommand ?? runPassValidationCommand
  const buildArtifact =
    dependencies.buildPassValidationEvidenceArtifact
    ?? buildPassValidationEvidenceArtifact
  const writeArtifact =
    dependencies.writePassValidationEvidenceArtifact
    ?? writePassValidationEvidenceArtifact
  const writeCompatibilityArtifact =
    dependencies.writePassValidationReviewerCompatibilityArtifact
    ?? writePassValidationReviewerCompatibilityArtifact

  const resolvedPolicy = resolvePolicy(input.bubbleConfig)
  const artifactPath = resolvePassValidationArtifactPath(input.artifactsDir)
  const reviewerArtifactPath =
    resolvePassValidationReviewerCompatibilityArtifactPath(input.artifactsDir)

  if (resolvedPolicy.policyState === "policy_configured" && resolvedPolicy.invalidReason !== undefined) {
    throwPassValidationFailure(
      input.createError,
      "pass_validation_command_missing",
      resolvedPolicy.invalidReason
    )
  }

  const executedCommands: PassValidationCommandResult[] = []
  if (resolvedPolicy.policyState === "policy_configured") {
    for (const command of resolvedPolicy.commands) {
      let result: Awaited<ReturnType<typeof runPassValidationCommand>>
      try {
        result = await runValidationCommand({
          kind: command.kind,
          command: command.command,
          worktreePath: input.worktreePath
        })
      } catch (error) {
        if (error instanceof PassValidationRunnerExecutionError) {
          throwPassValidationFailure(
            input.createError,
            "pass_validation_execution_error",
            `PASS validation execution failed for ${command.kind}. See ${error.logPath}.`
          )
        }

        throwPassValidationFailure(
          input.createError,
          "pass_validation_execution_error",
          `PASS validation execution failed for ${command.kind}: ${toFailureReason(error)}`
        )
      }

      const executed: PassValidationCommandResult = {
        kind: command.kind,
        command: result.command,
        exitCode: result.exitCode,
        logPath: result.logPath,
        durationMs: result.durationMs
      }
      executedCommands.push(executed)

      if (result.exitCode !== 0) {
        throwPassValidationFailure(
          input.createError,
          "pass_validation_command_failed",
          `PASS validation command '${command.kind}' failed with exit ${result.exitCode}. See ${result.logPath}.`
        )
      }
    }
  }

  const reviewerTestDirective = createPassValidationReviewerDirective({
    policyState: resolvedPolicy.policyState,
    executedCommands
  })

  const artifact = await buildArtifact({
    bubbleId: input.bubbleId,
    round: input.round,
    generatedAt: input.now.toISOString(),
    worktreePath: input.worktreePath,
    policyState: resolvedPolicy.policyState,
    requiredCommandSetId: resolvedPolicy.requiredCommandSetId,
    trustLevel:
      reviewerTestDirective.verification_status === "trusted"
        ? "trusted"
        : "untrusted",
    trustReasonCode:
      resolvedPolicy.policyState === "policy_missing"
        ? "pass_validation_policy_missing"
        : "no_trigger",
    commands:
      resolvedPolicy.policyState === "policy_configured"
        ? executedCommands
        : resolvedPolicy.commands
  }).catch((error) =>
    throwPassValidationFailure(
      input.createError,
      "pass_validation_artifact_persist_failed",
      `Failed to build PASS validation artifact: ${toFailureReason(error)}`
    )
  )

  await writeArtifact(artifactPath, artifact).catch((error) =>
    throwPassValidationFailure(
      input.createError,
      "pass_validation_artifact_persist_failed",
      `Failed to persist PASS validation artifact at ${artifactPath}: ${toFailureReason(error)}`
    )
  )

  let compatibilityArtifactWriteFailureReason: string | undefined
  await writeCompatibilityArtifact(reviewerArtifactPath, reviewerTestDirective).catch((error) => {
    compatibilityArtifactWriteFailureReason = buildCompatibilityWriteFailureReason(error)
  })

  return {
    reviewerTestDirective,
    validationRefs: executedCommands.map((command) => command.logPath),
    ...(compatibilityArtifactWriteFailureReason !== undefined
      ? { compatibilityArtifactWriteFailureReason }
      : {})
  }
}
