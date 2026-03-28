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
  message: string,
  context: Record<string, unknown>
): never {
  throw createError({
    reasonCode,
    message,
    context
  })
}

function buildPassValidationErrorContext(input: {
  bubbleId: string
  senderRole: "implementer" | "reviewer"
  round: number
  worktreePath: string
  artifactsDir: string
  commandKind?: string
  commandPath?: string
  artifactPath?: string
  policyState?: string
}): Record<string, unknown> {
  return {
    bubble_id: input.bubbleId,
    sender_role: input.senderRole,
    round: input.round,
    worktree_path: input.worktreePath,
    artifacts_dir: input.artifactsDir,
    ...(input.commandKind !== undefined ? { command_kind: input.commandKind } : {}),
    ...(input.commandPath !== undefined ? { command_path: input.commandPath } : {}),
    ...(input.artifactPath !== undefined ? { artifact_path: input.artifactPath } : {}),
    ...(input.policyState !== undefined ? { policy_state: input.policyState } : {})
  }
}

async function executeConfiguredValidationCommands(input: {
  resolvedPolicy: ReturnType<typeof resolvePassValidationPolicy>
  runValidationCommand: typeof runPassValidationCommand
  createError: PairflowCreateCommandError
  bubbleId: string
  senderRole: "implementer" | "reviewer"
  round: number
  worktreePath: string
  artifactsDir: string
}): Promise<PassValidationCommandResult[]> {
  if (input.resolvedPolicy.policyState !== "policy_configured") {
    return []
  }

  const executedCommands: PassValidationCommandResult[] = []
  for (const command of input.resolvedPolicy.commands) {
    let result: Awaited<ReturnType<typeof runPassValidationCommand>>
    try {
      result = await input.runValidationCommand({
        kind: command.kind,
        command: command.command,
        worktreePath: input.worktreePath
      })
    } catch (error) {
      if (error instanceof PassValidationRunnerExecutionError) {
        throwPassValidationFailure(
          input.createError,
          "pass_validation_execution_error",
          `PASS validation execution failed for ${command.kind}. See ${error.logPath}.`,
          buildPassValidationErrorContext({
            bubbleId: input.bubbleId,
            senderRole: input.senderRole,
            round: input.round,
            worktreePath: input.worktreePath,
            artifactsDir: input.artifactsDir,
            commandKind: command.kind,
            commandPath: command.command,
            policyState: input.resolvedPolicy.policyState
          })
        )
      }

      throwPassValidationFailure(
        input.createError,
        "pass_validation_execution_error",
        `PASS validation execution failed for ${command.kind}: ${toFailureReason(error)}`,
        buildPassValidationErrorContext({
          bubbleId: input.bubbleId,
          senderRole: input.senderRole,
          round: input.round,
          worktreePath: input.worktreePath,
          artifactsDir: input.artifactsDir,
          commandKind: command.kind,
          commandPath: command.command,
          policyState: input.resolvedPolicy.policyState
        })
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
        `PASS validation command '${command.kind}' failed with exit ${result.exitCode}. See ${result.logPath}.`,
        buildPassValidationErrorContext({
          bubbleId: input.bubbleId,
          senderRole: input.senderRole,
          round: input.round,
          worktreePath: input.worktreePath,
          artifactsDir: input.artifactsDir,
          commandKind: command.kind,
          commandPath: result.command,
          policyState: input.resolvedPolicy.policyState
        })
      )
    }
  }

  return executedCommands
}

async function persistPassValidationArtifacts(input: {
  bubbleId: string
  senderRole: "implementer" | "reviewer"
  round: number
  now: Date
  worktreePath: string
  artifactsDir: string
  artifactPath: string
  reviewerArtifactPath: string
  resolvedPolicy: ReturnType<typeof resolvePassValidationPolicy>
  executedCommands: PassValidationCommandResult[]
  reviewerTestDirective: ReviewerTestExecutionDirective
  buildArtifact: typeof buildPassValidationEvidenceArtifact
  writeArtifact: typeof writePassValidationEvidenceArtifact
  writeCompatibilityArtifact: typeof writePassValidationReviewerCompatibilityArtifact
  createError: PairflowCreateCommandError
}): Promise<string | undefined> {
  const artifact = await input.buildArtifact({
    bubbleId: input.bubbleId,
    round: input.round,
    generatedAt: input.now.toISOString(),
    worktreePath: input.worktreePath,
    policyState: input.resolvedPolicy.policyState,
    requiredCommandSetId: input.resolvedPolicy.requiredCommandSetId,
    trustLevel:
      input.reviewerTestDirective.verification_status === "trusted"
        ? "trusted"
        : "untrusted",
    trustReasonCode:
      input.resolvedPolicy.policyState === "policy_missing"
        ? "pass_validation_policy_missing"
        : "no_trigger",
    commands:
      input.resolvedPolicy.policyState === "policy_configured"
        ? input.executedCommands
        : input.resolvedPolicy.commands
  }).catch((error) =>
    throwPassValidationFailure(
      input.createError,
      "pass_validation_artifact_persist_failed",
      `Failed to build PASS validation artifact: ${toFailureReason(error)}`,
      buildPassValidationErrorContext({
        bubbleId: input.bubbleId,
        senderRole: input.senderRole,
        round: input.round,
        worktreePath: input.worktreePath,
        artifactsDir: input.artifactsDir,
        artifactPath: input.artifactPath,
        policyState: input.resolvedPolicy.policyState
      })
    )
  )

  await input.writeArtifact(input.artifactPath, artifact).catch((error) =>
    throwPassValidationFailure(
      input.createError,
      "pass_validation_artifact_persist_failed",
      `Failed to persist PASS validation artifact at ${input.artifactPath}: ${toFailureReason(error)}`,
      buildPassValidationErrorContext({
        bubbleId: input.bubbleId,
        senderRole: input.senderRole,
        round: input.round,
        worktreePath: input.worktreePath,
        artifactsDir: input.artifactsDir,
        artifactPath: input.artifactPath,
        policyState: input.resolvedPolicy.policyState
      })
    )
  )

  let compatibilityArtifactWriteFailureReason: string | undefined
  await input.writeCompatibilityArtifact(
    input.reviewerArtifactPath,
    input.reviewerTestDirective
  ).catch((error) => {
    compatibilityArtifactWriteFailureReason = buildCompatibilityWriteFailureReason(error)
  })

  return compatibilityArtifactWriteFailureReason
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
      resolvedPolicy.invalidReason,
      buildPassValidationErrorContext({
        bubbleId: input.bubbleId,
        senderRole: input.senderRole,
        round: input.round,
        worktreePath: input.worktreePath,
        artifactsDir: input.artifactsDir,
        policyState: resolvedPolicy.policyState
      })
    )
  }

  const executedCommands = await executeConfiguredValidationCommands({
    resolvedPolicy,
    runValidationCommand,
    createError: input.createError,
    bubbleId: input.bubbleId,
    senderRole: input.senderRole,
    round: input.round,
    worktreePath: input.worktreePath,
    artifactsDir: input.artifactsDir
  })

  const reviewerTestDirective = createPassValidationReviewerDirective({
    policyState: resolvedPolicy.policyState,
    executedCommands
  })

  const compatibilityArtifactWriteFailureReason =
    await persistPassValidationArtifacts({
      bubbleId: input.bubbleId,
      senderRole: input.senderRole,
      round: input.round,
      now: input.now,
      worktreePath: input.worktreePath,
      artifactsDir: input.artifactsDir,
      artifactPath,
      reviewerArtifactPath,
      resolvedPolicy,
      executedCommands,
      reviewerTestDirective,
      buildArtifact,
      writeArtifact,
      writeCompatibilityArtifact,
      createError: input.createError
    })

  return {
    reviewerTestDirective,
    validationRefs: executedCommands.map((command) => command.logPath),
    ...(compatibilityArtifactWriteFailureReason !== undefined
      ? { compatibilityArtifactWriteFailureReason }
      : {})
  }
}
