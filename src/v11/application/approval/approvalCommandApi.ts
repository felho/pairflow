import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../../infrastructure/artifact/transcript/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { emitTmuxDeliveryNotification, resolveDeliveryMessageRef } from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import {
  emitApprovalDecisionCommandOrchestration,
  emitRequestReworkCommandOrchestration,
  throwAsApprovalCommandError
} from "./approvalCommandOrchestration.js";
import {
  resolveApprovalCommandDependencies,
  type ApprovalCommandDefaultDependencies,
} from "./approvalCommandDependencyResolution.js";
import type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
import { ApprovalCommandError } from "../../shared/approval/approvalCommandError.js";

const defaultApprovalCommandDependencies: ApprovalCommandDefaultDependencies = {
  appendProtocolEnvelope,
  emitTmuxDeliveryNotification,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  resolveDeliveryMessageRef,
  writeStateSnapshot
};

export async function emitApprovalDecision(
  input: EmitApprovalDecisionInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitApprovalDecisionResult> {
  const resolvedDependencies = resolveApprovalCommandDependencies(
    dependencies,
    defaultApprovalCommandDependencies
  );
  return emitApprovalDecisionCommandOrchestration(input, resolvedDependencies);
}

export async function emitApprove(
  input: EmitApproveInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitApprovalDecisionResult> {
  return emitApprovalDecision(
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

export async function emitRequestRework(
  input: EmitRequestReworkInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitRequestReworkResult> {
  const resolvedDependencies = resolveApprovalCommandDependencies(
    dependencies,
    defaultApprovalCommandDependencies
  );
  return emitRequestReworkCommandOrchestration(input, resolvedDependencies);
}

export {
  ApprovalCommandError,
  throwAsApprovalCommandError as asApprovalCommandError
};

export type {
  ApprovalCommandDefaultDependencies,
  ApprovalCommandDependencies,
  ResolvedApprovalCommandDependencies
} from "./approvalCommandDependencyResolution.js";
export type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkInput,
  EmitRequestReworkQueuedResult,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
