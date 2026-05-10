import {
  emitApprovalDecisionCommandOrchestration,
  emitRequestReworkCommandOrchestration,
  throwAsApprovalCommandError
} from "./internal/command/approvalCommandBoundary.js";
import {
  resolveApprovalCommandDependencies
} from "./internal/command/approvalCommandDependencies.js";
import {
  loadExecuteRemoteBubbleApprovalCommandDefault
} from "./internal/remote/remoteApprovalCommandPort.js";
import type {
  EmitApprovalDecisionInput,
  EmitApprovalDecisionImmediateResult,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
import type {
  ApprovalCommandDefaultDependencies as InternalApprovalCommandDefaultDependencies,
  ApprovalCommandDependencies as InternalApprovalCommandDependencies,
  ResolvedApprovalCommandDependencies as InternalResolvedApprovalCommandDependencies
} from "./internal/command/approvalCommandDependencies.js";
import { ApprovalCommandError } from "./approvalCommandError.js";
import { startCommandContextDefaults } from "../start/startCommandDependencyDefaults.js";
import { reviewerDeliveryDefaults } from "../pass/reviewerDeliveryDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../start/startCommandDependencyDefaults.js";

let approvalDependencyDefaultsPromise:
  | Promise<InternalApprovalCommandDefaultDependencies>
  | undefined;

async function ensureBubbleInstanceIdForMutation(
  ...args: Parameters<
    InternalApprovalCommandDefaultDependencies["ensureBubbleInstanceIdForMutation"]
  >
): Promise<
  Awaited<
    ReturnType<
      InternalApprovalCommandDefaultDependencies["ensureBubbleInstanceIdForMutation"]
    >
  >
> {
  return startCommandContextDefaults.ensureBubbleInstanceIdForMutation(...args);
}

async function resolveBubbleById(
  ...args: Parameters<InternalApprovalCommandDefaultDependencies["resolveBubbleById"]>
): Promise<
  Awaited<ReturnType<InternalApprovalCommandDefaultDependencies["resolveBubbleById"]>>
> {
  return startCommandContextDefaults.resolveBubbleById(...args);
}

async function loadApprovalDependencyDefaults(): Promise<InternalApprovalCommandDefaultDependencies> {
  const executeRemoteBubbleApprovalCommand =
    await loadExecuteRemoteBubbleApprovalCommandDefault();
  approvalDependencyDefaultsPromise ??= Promise.resolve({
    appendProtocolEnvelope,
    emitDeliveryNotificationAck:
      reviewerDeliveryDefaults.emitDeliveryNotificationAck,
    executeRemoteBubbleApprovalCommand,
    ensureBubbleInstanceIdForMutation,
    readRemotePointer: startCommandContextDefaults.readRemotePointer,
    readStateSnapshot: startCommandContextDefaults.readStateSnapshot,
    readTranscriptEnvelopes,
    resolveRemoteBubbleStatusTarget:
      startCommandContextDefaults.resolveRemoteBubbleStatusTarget,
    resolveBubbleById,
    resolveBubbleFromWorkspaceCwd:
      startCommandContextDefaults.resolveBubbleFromWorkspaceCwd,
    resolveDeliveryMessageRef: reviewerDeliveryDefaults.resolveDeliveryMessageRef,
    writeStateSnapshot: startCommandContextDefaults.writeStateSnapshot
  });
  return approvalDependencyDefaultsPromise;
}

export async function emitApprovalDecision(
  input: EmitApprovalDecisionInput,
  dependencies: InternalApprovalCommandDependencies = {}
): Promise<EmitApprovalDecisionResult> {
  const approvalDependencyDefaults = await loadApprovalDependencyDefaults();
  const resolvedDependencies = resolveApprovalCommandDependencies(
    dependencies,
    approvalDependencyDefaults
  );
  return emitApprovalDecisionCommandOrchestration(input, resolvedDependencies);
}

export async function emitApprove(
  input: EmitApproveInput,
  dependencies: InternalApprovalCommandDependencies = {}
): Promise<EmitApprovalDecisionImmediateResult> {
  const result = await emitApprovalDecision(
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
    throw new ApprovalCommandError({
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

export async function emitRequestRework(
  input: EmitRequestReworkInput,
  dependencies: InternalApprovalCommandDependencies = {}
): Promise<EmitRequestReworkResult> {
  const approvalDependencyDefaults = await loadApprovalDependencyDefaults();
  const resolvedDependencies = resolveApprovalCommandDependencies(
    dependencies,
    approvalDependencyDefaults
  );
  return emitRequestReworkCommandOrchestration(input, resolvedDependencies);
}

export {
  ApprovalCommandError,
  throwAsApprovalCommandError as asApprovalCommandError
};

export type ApprovalCommandDependencies = InternalApprovalCommandDependencies;
export type ApprovalCommandDefaultDependencies =
  InternalApprovalCommandDefaultDependencies;
export type ResolvedApprovalCommandDependencies =
  InternalResolvedApprovalCommandDependencies;
export type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionImmediateResult,
  EmitApprovalDecisionQueuedReworkResult,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkInput,
  EmitRequestReworkQueuedResult,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
