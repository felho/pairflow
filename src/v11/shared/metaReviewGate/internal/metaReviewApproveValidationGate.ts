import type { FinalizeCurrentRunMetaReviewGateInput } from "../metaReviewGateCurrentRunTypes.js";
import {
  resolveMetaReviewApproveValidationPolicy,
  type MetaReviewApproveValidationCommandSpec
} from "./metaReviewApproveValidationPolicy.js";
import {
  buildApproveValidationFailureReason,
  buildApproveValidationRunnerFailureReason
} from "./metaReviewApproveValidationDiagnostics.js";

export { META_REVIEW_APPROVE_VALIDATION_FAILED } from "./metaReviewApproveValidationDiagnostics.js";

interface MetaReviewApproveValidationCommandResult
  extends MetaReviewApproveValidationCommandSpec {
  exitCode: number;
  logPath: string;
  durationMs: number;
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
