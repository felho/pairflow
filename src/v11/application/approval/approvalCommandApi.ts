import {
  emitApprovalDecisionCommandOrchestration,
  emitRequestReworkCommandOrchestration,
  throwAsApprovalCommandError
} from "./approvalCommandOrchestration.js";
import {
  resolveApprovalCommandDependencies,
} from "./approvalCommandDependencyResolution.js";
import {
  loadExecuteRemoteBubbleApprovalCommandDefault
} from "./approvalRemoteExecutionContract.js";
import type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
import type { ApprovalCommandDefaultDependencies } from "./approvalCommandDependencyResolution.js";
import { ApprovalCommandError } from "./approvalCommandError.js";
import { startCommandContextDefaults } from "../start/startCommandDependencyDefaults.js";
import { reviewerDeliveryDefaults } from "../pass/reviewerDeliveryDefaults.js";
import { statusCommandDependencyDefaults } from "../status/statusCommandDependencyDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../transcript/transcriptDependencyDefaults.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStoreDependencyDefaults.js";

let approvalDependencyDefaultsPromise:
  | Promise<ApprovalCommandDefaultDependencies>
  | undefined;

async function ensureBubbleInstanceIdForMutation(
  ...args: Parameters<
    ApprovalCommandDefaultDependencies["ensureBubbleInstanceIdForMutation"]
  >
): Promise<
  Awaited<
    ReturnType<
      ApprovalCommandDefaultDependencies["ensureBubbleInstanceIdForMutation"]
    >
  >
> {
  return startCommandContextDefaults.ensureBubbleInstanceIdForMutation(...args);
}

async function resolveBubbleById(
  ...args: Parameters<ApprovalCommandDefaultDependencies["resolveBubbleById"]>
): Promise<
  Awaited<ReturnType<ApprovalCommandDefaultDependencies["resolveBubbleById"]>>
> {
  return startCommandContextDefaults.resolveBubbleById(...args);
}

async function loadApprovalDependencyDefaults(): Promise<ApprovalCommandDefaultDependencies> {
  const executeRemoteBubbleApprovalCommand =
    await loadExecuteRemoteBubbleApprovalCommandDefault();
  approvalDependencyDefaultsPromise ??= Promise.resolve({
    appendProtocolEnvelope,
    emitDeliveryNotificationAck:
      reviewerDeliveryDefaults.emitDeliveryNotificationAck,
    executeRemoteBubbleApprovalCommand,
    ensureBubbleInstanceIdForMutation,
    readRemotePointer: statusCommandDependencyDefaults.readRemotePointer,
    readStateSnapshot,
    readTranscriptEnvelopes,
    resolveRemoteBubbleStatusTarget:
      statusCommandDependencyDefaults.resolveRemoteBubbleStatusTarget,
    resolveBubbleById,
    resolveBubbleFromWorkspaceCwd:
      startCommandContextDefaults.resolveBubbleFromWorkspaceCwd,
    resolveDeliveryMessageRef: reviewerDeliveryDefaults.resolveDeliveryMessageRef,
    writeStateSnapshot
  });
  return approvalDependencyDefaultsPromise;
}

export async function emitApprovalDecision(
  input: EmitApprovalDecisionInput,
  dependencies: EmitApprovalDecisionDependencies = {}
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
