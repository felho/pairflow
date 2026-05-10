import type {
  ResolvedApprovalCommandDependencies
} from "./approvalCommandDependencies.js";
import {
  createApprovalCommandError,
  isApprovalCommandError
} from "../../approvalCommandError.js";
import { normalizeApprovalCommandError } from "./approvalCommandErrorNormalization.js";
import {
  normalizeApprovalDecisionInput,
  normalizeRequestReworkInput
} from "./approvalCommandInputNormalization.js";
import {
  runApprovalCommandPipeline
} from "../pipeline/approvalCommandPipeline.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";
import type {
  EmitApprovalDecisionImmediateResult,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput,
  EmitRequestReworkResult
} from "../../approvalCommandContract.js";

export async function emitApprovalDecisionCommandOrchestration(
  input: EmitApprovalDecisionInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitApprovalDecisionResult> {
  const normalized = normalizeApprovalDecisionInput({
    bubbleId: input.bubbleId,
    decision: input.decision,
    overrideReason: input.overrideReason,
    message: input.message,
    refs: input.refs,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now,
    createApprovalCommandError
  });
  const result = await runApprovalCommandPipeline(
    {
      intent: "approval_decision",
      ...normalized,
      overrideNonApprove: input.overrideNonApprove,
      createError: createApprovalCommandError
    },
    dependencies
  );
  return result as EmitApprovalDecisionResult;
}

export async function emitApproveCommandOrchestration(
  input: EmitApproveInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitApprovalDecisionImmediateResult> {
  const result = await emitApprovalDecisionCommandOrchestration(
    {
      bubbleId: input.bubbleId,
      decision: "approve",
      overrideNonApprove: input.overrideNonApprove,
      overrideReason: input.overrideReason,
      refs: input.refs,
      repoPath: input.repoPath,
      cwd: input.cwd,
      now: input.now
    },
    dependencies
  );
  if (!("sequence" in result)) {
    throw createApprovalCommandError({
      reasonCode: "APPROVAL_REMOTE_RESULT_INVALID",
      message:
        `Remote approve for '${input.bubbleId}' returned a queued rework result.`,
      context: {
        command_name: "approval",
        bubble_id: input.bubbleId
      }
    });
  }
  return result;
}

export async function emitRequestReworkCommandOrchestration(
  input: EmitRequestReworkInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitRequestReworkResult> {
  const normalized = normalizeRequestReworkInput({
    bubbleId: input.bubbleId,
    message: input.message,
    refs: input.refs,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now,
    createApprovalCommandError
  });
  const result = await runApprovalCommandPipeline(
    {
      intent: "request_rework",
      ...normalized,
      createError: createApprovalCommandError
    },
    dependencies
  );
  return result as EmitRequestReworkResult;
}

export function throwAsApprovalCommandError(error: unknown): never {
  throw normalizeApprovalCommandError({
    error,
    isApprovalCommandError,
    createApprovalCommandError,
    isBubbleLookupError: (candidate) =>
      isNamedError(candidate, "BubbleLookupError"),
    isRemoteBubbleApprovalCommandError: (candidate) =>
      isNamedError(candidate, "RemoteBubbleApprovalCommandError"),
    isRemoteBubbleStatusError: (candidate) =>
      isNamedError(candidate, "RemoteBubbleStatusError")
  });
}
