import {
  applyMetaReviewGateOnConvergenceV11 as applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshotV11 as recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/emitMetaReviewGateV11.js";
import { convergedDependencyDefaults } from "../../../core/agent/convergedDefaults.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type { EmitBubbleNotificationPort } from "../../shared/ports/notifications.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../shared/ports/transcript.js";
import type {
  EmitTmuxDeliveryNotificationPort,
  ResolveDeliveryMessageRefPort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  RunConvergedFlowDependencies
} from "./runConvergedFlow.js";
import type { FinalizeConvergedFlowDependencies } from "./convergedFinalizationTypes.js";

export interface ResolvedConvergedExecutionDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  applyMetaReviewGateOnConvergence:
    NonNullable<RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"]>;
  recoverMetaReviewGateFromSnapshot:
    NonNullable<RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"]>;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  emitBubbleNotification: EmitBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}

export interface BuildDefaultConvergedExecutionDependenciesInput {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort | undefined;
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?:
    RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"];
  emitTmuxDeliveryNotification?:
    RunConvergedFlowDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?:
    RunConvergedFlowDependencies["emitBubbleNotification"];
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
}

export function buildDefaultConvergedExecutionDependencies(
  input: BuildDefaultConvergedExecutionDependenciesInput = {}
): ResolvedConvergedExecutionDependencies {
  return {
    appendProtocolEnvelope:
      input.appendProtocolEnvelope ??
      convergedDependencyDefaults.execution.appendProtocolEnvelope,
    applyMetaReviewGateOnConvergence:
      input.applyMetaReviewGateOnConvergence ??
      applyMetaReviewGateOnConvergence,
    recoverMetaReviewGateFromSnapshot:
      input.recoverMetaReviewGateFromSnapshot ??
      recoverMetaReviewGateFromSnapshot,
    emitTmuxDeliveryNotification:
      input.emitTmuxDeliveryNotification ??
      convergedDependencyDefaults.execution.emitTmuxDeliveryNotification,
    emitBubbleNotification:
      input.emitBubbleNotification ??
      convergedDependencyDefaults.execution.emitBubbleNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ??
      convergedDependencyDefaults.execution.resolveDeliveryMessageRef
  };
}

export interface ResolvedConvergedGateDeliveryDependencies {
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}

export interface BuildDefaultConvergedGateDeliveryDependenciesInput {
  emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort | undefined;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
}

export function buildDefaultConvergedGateDeliveryDependencies(
  input: BuildDefaultConvergedGateDeliveryDependenciesInput = {}
): ResolvedConvergedGateDeliveryDependencies {
  return {
    emitTmuxDeliveryNotification:
      input.emitTmuxDeliveryNotification ??
      convergedDependencyDefaults.gateDelivery.emitTmuxDeliveryNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ??
      convergedDependencyDefaults.gateDelivery.resolveDeliveryMessageRef
  };
}

export function resolveDefaultConvergedReadTranscriptEnvelopes(
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort
): ReadTranscriptEnvelopesPort {
  return (
    readTranscriptEnvelopes ??
    convergedDependencyDefaults.flow.readTranscriptEnvelopes
  );
}

export interface BuildDefaultConvergedFinalizationDependenciesInput {
  resolveMetaReviewRolloutBlockingReasonCodes:
    FinalizeConvergedFlowDependencies["resolveMetaReviewRolloutBlockingReasonCodes"];
  activeEntrypoint?: string | undefined;
  assessPairflowCommandPath?:
    FinalizeConvergedFlowDependencies["assessPairflowCommandPath"];
  emitBubbleLifecycleEventBestEffort?:
    FinalizeConvergedFlowDependencies["emitBubbleLifecycleEventBestEffort"];
}

export function buildDefaultConvergedFinalizationDependencies(
  input: BuildDefaultConvergedFinalizationDependenciesInput
): FinalizeConvergedFlowDependencies {
  return {
    resolveMetaReviewRolloutBlockingReasonCodes:
      input.resolveMetaReviewRolloutBlockingReasonCodes,
    ...(input.activeEntrypoint !== undefined
      ? { activeEntrypoint: input.activeEntrypoint }
      : {}),
    assessPairflowCommandPath:
      input.assessPairflowCommandPath ??
      convergedDependencyDefaults.finalization.assessPairflowCommandPath,
    emitBubbleLifecycleEventBestEffort:
      input.emitBubbleLifecycleEventBestEffort ??
      emitBubbleLifecycleEventBestEffort
  };
}
