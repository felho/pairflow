import type {
  ResolvedApprovalCommandDependencies
} from "./approvalCommandDependencyResolution.js";
import {
  createApprovalCommandError,
  isApprovalCommandError
} from "./approvalCommandError.js";
import { normalizeApprovalCommandError } from "./approvalCommandErrorNormalization.js";
import {
  normalizeApprovalDecisionInput,
  normalizeRequestReworkInput
} from "./approvalCommandInputNormalization.js";
import {
  runApprovalDecisionFlow,
  runRequestReworkFlow
} from "../flow/runApprovalFlow.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";
import type {
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";

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
  return runApprovalDecisionFlow(
    {
      ...normalized,
      overrideNonApprove: input.overrideNonApprove,
      createError: createApprovalCommandError
    },
    dependencies
  );
}

export async function emitApproveCommandOrchestration(
  input: EmitApproveInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitApprovalDecisionResult> {
  return emitApprovalDecisionCommandOrchestration(
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
  return runRequestReworkFlow(
    {
      ...normalized,
      createError: createApprovalCommandError
    },
    dependencies
  );
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
