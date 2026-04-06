import { BubbleLookupError } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput,
  EmitRequestReworkResult
} from "../../application/approval/approvalCommandContract.js";
import {
  runApprovalDecisionFlow,
  runRequestReworkFlow
} from "../../application/approval/runApprovalFlow.js";
import {
  type ApprovalCommandDependencies,
  resolveApprovalCommandDependencies
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

type ApprovalRuntimeDependencies = EmitApprovalDecisionDependencies
  & Omit<ApprovalCommandDependencies, "emitTmuxDeliveryNotification">;

export async function emitApprovalDecisionCommandOrchestration(
  input: EmitApprovalDecisionInput,
  dependencies: ApprovalRuntimeDependencies = {}
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
  const resolvedDependencies = resolveApprovalCommandDependencies({
    ...dependencies
  });
  return runApprovalDecisionFlow(
    {
      ...normalized,
      overrideNonApprove: input.overrideNonApprove,
      createError: createApprovalCommandError
    },
    resolvedDependencies
  );
}

export async function emitApproveCommandOrchestration(
  input: EmitApproveInput,
  dependencies: ApprovalRuntimeDependencies = {}
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
  dependencies: ApprovalRuntimeDependencies = {}
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
  const resolvedDependencies = resolveApprovalCommandDependencies({
    ...dependencies
  });
  return runRequestReworkFlow(
    {
      ...normalized,
      createError: createApprovalCommandError
    },
    resolvedDependencies
  );
}

export function throwAsApprovalCommandError(error: unknown): never {
  throw normalizeApprovalCommandError({
    error,
    isApprovalCommandError,
    createApprovalCommandError,
    isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError
  });
}
