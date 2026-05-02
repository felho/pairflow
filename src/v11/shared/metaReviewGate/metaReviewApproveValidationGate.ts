import { isValidationCommandId } from "../validation/validationCommandId.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "./metaReviewGateCurrentRunTypes.js";

export const META_REVIEW_APPROVE_VALIDATION_FAILED =
  "META_REVIEW_APPROVE_VALIDATION_FAILED" as const;

interface MetaReviewApproveValidationCommandSpec {
  kind: string;
  command: string;
  targetId?: string;
  cwd?: string;
  targetPaths?: string[];
}

interface MetaReviewApproveValidationCommandResult
  extends MetaReviewApproveValidationCommandSpec {
  exitCode: number;
  logPath: string;
  durationMs: number;
}

type MetaReviewApproveValidationPolicyState =
  | "policy_missing"
  | "policy_configured"
  | "policy_explicit_null";

interface ResolvedMetaReviewApproveValidationPolicy {
  policyState: MetaReviewApproveValidationPolicyState;
  commands: MetaReviewApproveValidationCommandSpec[];
  requiredCommandSetId: string | null;
  invalidReason?: string;
}

function normalizeCommand(command: string | undefined): string | undefined {
  if (command === undefined) {
    return undefined;
  }
  const normalized = command.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveMetaReviewApproveValidationPolicy(
  bubbleConfig: Partial<Pick<BubbleConfig, "commands" | "validation_target">>
): ResolvedMetaReviewApproveValidationPolicy {
  const required = bubbleConfig.commands?.meta_review_approve_required;

  if (required === undefined) {
    return {
      policyState: "policy_missing",
      commands: [],
      requiredCommandSetId: null
    };
  }

  if (required.length === 0) {
    return {
      policyState: "policy_explicit_null",
      commands: [],
      requiredCommandSetId: "explicit-null"
    };
  }

  const resolvedCommands: MetaReviewApproveValidationCommandSpec[] = [];
  const orderedRequiredIds: string[] = [];
  const seenRequiredIds = new Set<string>();
  for (const rawId of required) {
    if (!isValidationCommandId(rawId)) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.meta_review_approve_required references unsupported id '${rawId}'.`
      };
    }
    if (seenRequiredIds.has(rawId)) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.meta_review_approve_required contains duplicate id '${rawId}'.`
      };
    }

    const commandCandidate = bubbleConfig.commands?.[rawId];
    if (typeof commandCandidate !== "string") {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.${rawId} must be a string for configured meta-review approve validation.`
      };
    }

    const resolvedCommand = normalizeCommand(commandCandidate);
    if (resolvedCommand === undefined) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.${rawId} is empty for configured meta-review approve validation.`
      };
    }

    seenRequiredIds.add(rawId);
    orderedRequiredIds.push(rawId);
    resolvedCommands.push({
      kind: rawId,
      command: resolvedCommand,
      ...(bubbleConfig.validation_target !== undefined
        ? { targetId: bubbleConfig.validation_target.id }
        : {}),
      ...(bubbleConfig.validation_target?.cwd !== undefined
        ? { cwd: bubbleConfig.validation_target.cwd }
        : {}),
      ...(bubbleConfig.validation_target?.paths !== undefined
        ? { targetPaths: [...bubbleConfig.validation_target.paths] }
        : {})
    });
  }

  return {
    policyState: "policy_configured",
    commands: resolvedCommands,
    requiredCommandSetId: orderedRequiredIds.join("__")
  };
}

function buildApproveValidationFailureReason(input: {
  stage: "resolve" | "exec" | "spawn" | "log";
  commandId: string;
  exitCode: number | null;
  logPath: string | null;
  detail: string;
}): string {
  return [
    `${META_REVIEW_APPROVE_VALIDATION_FAILED}: approve-gate validation failed`,
    `stage=${input.stage}`,
    `commandId=${input.commandId}`,
    `exitCode=${input.exitCode === null ? "null" : input.exitCode}`,
    `logPath=${input.logPath === null ? "null" : input.logPath}`,
    `detail=${input.detail}`
  ].join("; ");
}

type RunnerErrorStage =
  | "pre_header"
  | "spawn"
  | "settle"
  | "stdout"
  | "stderr";

function isRunnerErrorStage(stage: unknown): stage is RunnerErrorStage {
  return (
    stage === "pre_header" ||
    stage === "spawn" ||
    stage === "settle" ||
    stage === "stdout" ||
    stage === "stderr"
  );
}

function assertNeverRunnerStage(stage: never): never {
  void stage;
  // reason_code=META_REVIEW_APPROVE_VALIDATION_RUNNER_STAGE_UNHANDLED context=approve_validation_runner_stage_mapping
  throw new Error(
    "META_REVIEW_APPROVE_VALIDATION_RUNNER_STAGE_UNHANDLED: unhandled approve validation runner stage."
  );
}

function mapKnownRunnerErrorStage(stage: RunnerErrorStage): "spawn" | "log" | "exec" {
  switch (stage) {
    case "pre_header":
    case "stdout":
    case "stderr":
      return "log";
    case "settle":
      return "exec";
    case "spawn":
      return "spawn";
    default:
      return assertNeverRunnerStage(stage);
  }
}

function mapRunnerErrorStage(stage: unknown): "spawn" | "log" | "exec" {
  if (isRunnerErrorStage(stage)) {
    return mapKnownRunnerErrorStage(stage);
  }
  return "spawn";
}

function describeRunnerErrorStage(stage: unknown): string {
  return typeof stage === "string" ? stage : "unknown";
}

function buildApproveValidationRunnerFailureReason(input: {
  commandId: string;
  error: unknown;
}): string {
  const maybeRunnerError = input.error as { stage?: unknown; logPath?: unknown };
  return buildApproveValidationFailureReason({
    stage: mapRunnerErrorStage(maybeRunnerError.stage),
    commandId: input.commandId,
    exitCode: null,
    logPath:
      maybeRunnerError.stage === "pre_header"
        ? null
        : typeof maybeRunnerError.logPath === "string"
          ? maybeRunnerError.logPath
          : null,
    detail:
      `runnerStage=${describeRunnerErrorStage(maybeRunnerError.stage)}; ` +
      (input.error instanceof Error ? input.error.message : String(input.error))
  });
}

export async function runMetaReviewApproveValidationGate(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
}): Promise<
  | { ok: true; commands: MetaReviewApproveValidationCommandResult[] }
  | { ok: false; fallbackReason: string }
> {
  const policy = resolveMetaReviewApproveValidationPolicy(
    input.finalizeInput.resolved.bubbleConfig
  );
  if (
    policy.policyState === "policy_missing" ||
    policy.policyState === "policy_explicit_null"
  ) {
    return { ok: true, commands: [] };
  }
  if (policy.invalidReason !== undefined) {
    return {
      ok: false,
      fallbackReason: buildApproveValidationFailureReason({
        stage: "resolve",
        commandId: policy.requiredCommandSetId ?? "unknown",
        exitCode: null,
        logPath: null,
        detail: policy.invalidReason
      })
    };
  }

  const worktreePath = input.finalizeInput.resolved.bubblePaths.worktreePath;
  if (worktreePath === undefined) {
    return {
      ok: false,
      fallbackReason: buildApproveValidationFailureReason({
        stage: "spawn",
        commandId: policy.requiredCommandSetId ?? "unknown",
        exitCode: null,
        logPath: null,
        detail: "bubble worktree path is unavailable for approve-gate validation."
      })
    };
  }

  const runValidationCommand =
    input.finalizeInput.runMetaReviewApproveValidationCommand;
  if (runValidationCommand === undefined) {
    return {
      ok: false,
      fallbackReason: buildApproveValidationFailureReason({
        stage: "spawn",
        commandId: policy.requiredCommandSetId ?? "unknown",
        exitCode: null,
        logPath: null,
        detail: "approve-gate validation runner is unavailable."
      })
    };
  }

  const executedCommands: MetaReviewApproveValidationCommandResult[] = [];
  for (const command of policy.commands) {
    let result: Awaited<ReturnType<typeof runValidationCommand>>;
    try {
      result = await runValidationCommand({
        kind: command.kind,
        command: command.command,
        worktreePath,
        ...(command.cwd !== undefined ? { cwd: command.cwd } : {}),
        ...(command.targetId !== undefined ? { targetId: command.targetId } : {}),
        ...(command.targetPaths !== undefined
          ? { targetPaths: [...command.targetPaths] }
          : {}),
        evidence: {
          header: "pairflow meta-review approve validation",
          logPathPrefix: "meta-review-approve-validation",
          timestamp: input.finalizeInput.now.getTime()
        }
      });
    } catch (error) {
      return {
        ok: false,
        fallbackReason: buildApproveValidationRunnerFailureReason({
          commandId: command.kind,
          error
        })
      };
    }

    const executed: MetaReviewApproveValidationCommandResult = {
      kind: command.kind,
      command: result.command,
      exitCode: result.exitCode,
      logPath: result.logPath,
      durationMs: result.durationMs,
      ...(command.targetId !== undefined ? { targetId: command.targetId } : {}),
      ...(command.cwd !== undefined ? { cwd: result.executionCwd } : {}),
      ...(command.targetPaths !== undefined
        ? { targetPaths: [...command.targetPaths] }
        : {})
    };
    executedCommands.push(executed);

    if (result.exitCode !== 0) {
      return {
        ok: false,
        fallbackReason: buildApproveValidationFailureReason({
          stage: "exec",
          commandId: command.kind,
          exitCode: result.exitCode,
          logPath: result.logPath,
          detail: `command exited ${result.exitCode}`
        })
      };
    }
  }

  return { ok: true, commands: executedCommands };
}
