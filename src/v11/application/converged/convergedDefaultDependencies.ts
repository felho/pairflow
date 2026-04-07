import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { assessPairflowCommandPath } from "../../../core/runtime/pairflowCommand.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type { EmitBubbleNotificationPort } from "../../shared/ports/notifications.js";
import type {
  AppendProtocolEnvelopePort
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
      input.appendProtocolEnvelope ?? appendProtocolEnvelope,
    applyMetaReviewGateOnConvergence:
      input.applyMetaReviewGateOnConvergence ??
      applyMetaReviewGateOnConvergence,
    recoverMetaReviewGateFromSnapshot:
      input.recoverMetaReviewGateFromSnapshot ??
      recoverMetaReviewGateFromSnapshot,
    emitTmuxDeliveryNotification:
      input.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    emitBubbleNotification:
      input.emitBubbleNotification ?? emitBubbleNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef
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
      input.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef
  };
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
      input.assessPairflowCommandPath ?? assessPairflowCommandPath,
    emitBubbleLifecycleEventBestEffort:
      input.emitBubbleLifecycleEventBestEffort ??
      emitBubbleLifecycleEventBestEffort
  };
}
