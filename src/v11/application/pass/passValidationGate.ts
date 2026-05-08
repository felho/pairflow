import type { ReviewerTestExecutionDirective } from "../../../v11/shared/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../types/bubble.js";

export interface PassValidationCommandSpec {
  kind: string;
  command: string;
  targetId?: string;
  cwd?: string;
  targetPaths?: string[];
}

export interface PassValidationCommandResult {
  kind: string;
  command: string;
  exitCode: number;
  logPath: string;
  durationMs: number;
  targetId?: string;
  cwd?: string;
  targetPaths?: string[];
}

export interface ResolvedPassValidationPolicy {
  policyState: "policy_missing" | "policy_explicit_null" | "policy_configured";
  commands: PassValidationCommandSpec[];
  requiredCommandSetId: string | null;
  invalidReason?: string;
}

export interface PassValidationRunnerExecutionErrorLike extends Error {
  logPath: string;
  context?: {
    cwd?: string;
  } | undefined;
}

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
  resolvePassValidationPolicy?: (bubbleConfig: BubbleConfig) => ResolvedPassValidationPolicy
  runPassValidationCommand?: (input: {
    kind: string
    command: string
    worktreePath: string
    cwd?: string
  }) => Promise<{
    command: string
    exitCode: number
    logPath: string
    durationMs: number
    executionCwd: string
  }>
  buildPassValidationEvidenceArtifact?: (input: {
    bubbleId: string
    round: number
    generatedAt: string
    worktreePath: string
    policyState: ResolvedPassValidationPolicy["policyState"]
    requiredCommandSetId: string | null
    trustLevel: "trusted" | "untrusted"
    trustReasonCode: "no_trigger" | "pass_validation_policy_missing"
    commands: Array<PassValidationCommandSpec | PassValidationCommandResult>
  }) => Promise<unknown>
  createPassValidationReviewerDirective?: (input: {
    policyState: ResolvedPassValidationPolicy["policyState"]
    executedCommands: PassValidationCommandResult[]
  }) => ReviewerTestExecutionDirective
  resolvePassValidationArtifactPath?: (artifactsDir: string) => string
  resolvePassValidationReviewerCompatibilityArtifactPath?: (artifactsDir: string) => string
  isPassValidationRunnerExecutionError?: (
    error: unknown
  ) => error is PassValidationRunnerExecutionErrorLike
  writePassValidationEvidenceArtifact?: (
    artifactPath: string,
    artifact: unknown
  ) => Promise<void>
  writePassValidationReviewerCompatibilityArtifact?:
    (artifactPath: string, directive: ReviewerTestExecutionDirective) => Promise<void>
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
  cwd?: string
  executionCwd?: string
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
    ...(input.policyState !== undefined ? { policy_state: input.policyState } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    ...(input.executionCwd !== undefined ? { execution_cwd: input.executionCwd } : {})
  }
}

async function executeConfiguredValidationCommands(input: {
  resolvedPolicy: ResolvedPassValidationPolicy
  runValidationCommand: NonNullable<ResolvePassValidationForPassDependencies["runPassValidationCommand"]>
  isRunnerExecutionError:
    NonNullable<ResolvePassValidationForPassDependencies["isPassValidationRunnerExecutionError"]>
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
    let result: Awaited<ReturnType<NonNullable<ResolvePassValidationForPassDependencies["runPassValidationCommand"]>>>
    try {
      result = await input.runValidationCommand({
        kind: command.kind,
        command: command.command,
        worktreePath: input.worktreePath,
        ...(command.cwd !== undefined ? { cwd: command.cwd } : {})
      })
    } catch (error: unknown) {
      if (input.isRunnerExecutionError(error)) {
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
            ...(error.context?.cwd !== undefined ? { cwd: error.context.cwd } : {}),
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
      durationMs: result.durationMs,
      ...(command.targetId !== undefined ? { targetId: command.targetId } : {}),
      ...(command.cwd !== undefined
        ? { cwd: result.executionCwd }
        : {}),
      ...(command.targetPaths !== undefined
        ? { targetPaths: [...command.targetPaths] }
        : {})
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
  resolvedPolicy: ResolvedPassValidationPolicy
  executedCommands: PassValidationCommandResult[]
  reviewerTestDirective: ReviewerTestExecutionDirective
  buildArtifact: NonNullable<ResolvePassValidationForPassDependencies["buildPassValidationEvidenceArtifact"]>
  writeArtifact: NonNullable<ResolvePassValidationForPassDependencies["writePassValidationEvidenceArtifact"]>
  writeCompatibilityArtifact: NonNullable<ResolvePassValidationForPassDependencies["writePassValidationReviewerCompatibilityArtifact"]>
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
  }).catch((error: unknown) =>
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

  await input.writeArtifact(input.artifactPath, artifact).catch((error: unknown) =>
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
  ).catch((error: unknown) => {
    compatibilityArtifactWriteFailureReason = buildCompatibilityWriteFailureReason(error)
  })

  return compatibilityArtifactWriteFailureReason
}

function requirePassValidationDependency<T>(
  value: T | undefined,
  name: string,
  createError: PairflowCreateCommandError
): T {
  if (value === undefined) {
    throw createError({
      reasonCode: "pass_validation_dependency_missing",
      message: `Missing required PASS validation dependency: ${name}.`,
      context: {
        dependency: name
      }
    })
  }
  return value
}

type RequiredPassValidationDependency<
  TKey extends keyof ResolvePassValidationForPassDependencies
> = NonNullable<ResolvePassValidationForPassDependencies[TKey]>

interface ResolvedPassValidationDependencies {
  resolvePolicy: RequiredPassValidationDependency<"resolvePassValidationPolicy">
  runValidationCommand: RequiredPassValidationDependency<"runPassValidationCommand">
  buildArtifact: RequiredPassValidationDependency<"buildPassValidationEvidenceArtifact">
  writeArtifact: RequiredPassValidationDependency<"writePassValidationEvidenceArtifact">
  writeCompatibilityArtifact: RequiredPassValidationDependency<"writePassValidationReviewerCompatibilityArtifact">
  resolveArtifactPath: RequiredPassValidationDependency<"resolvePassValidationArtifactPath">
  resolveReviewerArtifactPath: RequiredPassValidationDependency<"resolvePassValidationReviewerCompatibilityArtifactPath">
  createReviewerDirective: RequiredPassValidationDependency<"createPassValidationReviewerDirective">
  isRunnerExecutionError: RequiredPassValidationDependency<"isPassValidationRunnerExecutionError">
}

function resolvePassValidationDependencies(
  dependencies: ResolvePassValidationForPassDependencies,
  createError: PairflowCreateCommandError
): ResolvedPassValidationDependencies {
  return {
    resolvePolicy: requirePassValidationDependency(
      dependencies.resolvePassValidationPolicy, "resolvePassValidationPolicy", createError
    ),
    runValidationCommand: requirePassValidationDependency(
      dependencies.runPassValidationCommand, "runPassValidationCommand", createError
    ),
    buildArtifact: requirePassValidationDependency(
      dependencies.buildPassValidationEvidenceArtifact, "buildPassValidationEvidenceArtifact", createError
    ),
    writeArtifact: requirePassValidationDependency(
      dependencies.writePassValidationEvidenceArtifact, "writePassValidationEvidenceArtifact", createError
    ),
    writeCompatibilityArtifact: requirePassValidationDependency(
      dependencies.writePassValidationReviewerCompatibilityArtifact,
      "writePassValidationReviewerCompatibilityArtifact", createError
    ),
    resolveArtifactPath: requirePassValidationDependency(
      dependencies.resolvePassValidationArtifactPath, "resolvePassValidationArtifactPath", createError
    ),
    resolveReviewerArtifactPath: requirePassValidationDependency(
      dependencies.resolvePassValidationReviewerCompatibilityArtifactPath,
      "resolvePassValidationReviewerCompatibilityArtifactPath", createError
    ),
    createReviewerDirective: requirePassValidationDependency(
      dependencies.createPassValidationReviewerDirective, "createPassValidationReviewerDirective", createError
    ),
    isRunnerExecutionError: requirePassValidationDependency(
      dependencies.isPassValidationRunnerExecutionError, "isPassValidationRunnerExecutionError", createError
    )
  }
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

  if (
    input.bubbleConfig.commands.validation_required === undefined &&
    dependencies.resolvePassValidationPolicy === undefined
  ) {
    return {
      validationRefs: []
    }
  }

  const resolvedDependencies = resolvePassValidationDependencies(
    dependencies,
    input.createError
  )

  const resolvedPolicy = resolvedDependencies.resolvePolicy(input.bubbleConfig)
  const artifactPath = resolvedDependencies.resolveArtifactPath(input.artifactsDir)
  const reviewerArtifactPath =
    resolvedDependencies.resolveReviewerArtifactPath(input.artifactsDir)

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
    runValidationCommand: resolvedDependencies.runValidationCommand,
    isRunnerExecutionError: resolvedDependencies.isRunnerExecutionError,
    createError: input.createError,
    bubbleId: input.bubbleId,
    senderRole: input.senderRole,
    round: input.round,
    worktreePath: input.worktreePath,
    artifactsDir: input.artifactsDir
  })

  const reviewerTestDirective = resolvedDependencies.createReviewerDirective({
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
      buildArtifact: resolvedDependencies.buildArtifact,
      writeArtifact: resolvedDependencies.writeArtifact,
      writeCompatibilityArtifact:
        resolvedDependencies.writeCompatibilityArtifact,
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
