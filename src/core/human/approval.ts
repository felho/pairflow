import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../protocol/transcriptStore.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStore.js";
import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import {
  emitApprovalDecisionCommandOrchestration,
  emitApproveCommandOrchestration,
  emitRequestReworkCommandOrchestration,
  throwAsApprovalCommandError
} from "../../v11/application/approval/approvalCommandOrchestration.js";
import {
  resolveApprovalCommandDependencies,
  type ApprovalCommandDependencies,
  type ApprovalCommandDefaultDependencies
} from "../../v11/application/approval/approvalCommandDependencyResolution.js";
import { ApprovalCommandError } from "../../v11/shared/approval/approvalCommandError.js";
import type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkInput,
  EmitRequestReworkQueuedResult,
  EmitRequestReworkResult
} from "../../v11/application/approval/approvalCommandContract.js";

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
  return emitApprovalDecisionCommandOrchestration(
    input,
    resolvedDependencies
  );
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
  return emitRequestReworkCommandOrchestration(
    input,
    resolvedDependencies
  );
}

export {
  ApprovalCommandError,
  throwAsApprovalCommandError as asApprovalCommandError
};

export type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkInput,
  EmitRequestReworkQueuedResult,
  EmitRequestReworkResult
} from "../../v11/application/approval/approvalCommandContract.js";
export type {
  ApprovalCommandDependencies,
  ApprovalCommandDefaultDependencies,
  ResolvedApprovalCommandDependencies
} from "../../v11/application/approval/approvalCommandDependencyResolution.js";
