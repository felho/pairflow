import { convergedDependencyDefaults } from "../../convergedDependencyDefaults.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../metrics/bubbleEvents.js";
import type { EmitBubbleNotificationPort } from "../../../../ports/notifications.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../../../ports/transcript.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../../../ports/tmuxDelivery.js";
import type {
  RunConvergedFlowDependencies
} from "../flow/runConvergedFlow.js";
import type { FinalizeConvergedFlowDependencies } from "../finalization/convergedFinalizationTypes.js";

export interface ResolvedConvergedExecutionDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  applyMetaReviewGateOnConvergence:
    NonNullable<RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"]>;
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  emitBubbleNotification: EmitBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}

export interface BuildDefaultConvergedExecutionDependenciesInput {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort | undefined;
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort | undefined;
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
      convergedDependencyDefaults.execution.applyMetaReviewGateOnConvergence,
    emitDeliveryNotificationAck:
      input.emitDeliveryNotificationAck ??
      convergedDependencyDefaults.execution.emitDeliveryNotificationAck,
    emitBubbleNotification:
      input.emitBubbleNotification ??
      convergedDependencyDefaults.execution.emitBubbleNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ??
      convergedDependencyDefaults.execution.resolveDeliveryMessageRef
  };
}

export interface ResolvedConvergedGateDeliveryDependencies {
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}

export interface BuildDefaultConvergedGateDeliveryDependenciesInput {
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort | undefined;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
}

export function buildDefaultConvergedGateDeliveryDependencies(
  input: BuildDefaultConvergedGateDeliveryDependenciesInput = {}
): ResolvedConvergedGateDeliveryDependencies {
  return {
    emitDeliveryNotificationAck:
      input.emitDeliveryNotificationAck ??
      convergedDependencyDefaults.gateDelivery.emitDeliveryNotificationAck,
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
