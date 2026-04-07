import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type {
  appendProtocolEnvelope,
  AppendProtocolEnvelopeResult
} from "../../../core/protocol/transcriptStore.js";
import type {
  writeStateSnapshot,
  LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import type { applyStateTransition } from "../../domain/state/machine.js";
import type {
  DeliveryTargetReasonCode,
  emitTmuxDeliveryNotification,
  EmitTmuxDeliveryNotificationResult,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import type { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface RunAskHumanFlowInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: PairflowCreateCommandError;
}

export interface ExecuteAskHumanExecutionInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: PairflowCreateCommandError;
}

export interface ExecuteAskHumanExecutionResult {
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

export interface ExecuteAskHumanExecutionDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
}

export interface FinalizeAskHumanFlowInput {
  now: Date;
  routing: AskHumanRoutingContext;
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

export interface FinalizeAskHumanFlowDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export interface RunAskHumanFlowResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
  delivery?: {
    delivered: boolean;
    message?: string;
    reason?: Exclude<EmitTmuxDeliveryNotificationResult["reason"], undefined>;
    deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  };
}

export interface AskHumanDeliveryResult {
  deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
}

export interface RunAskHumanFlowDependencies {
  executeAskHumanExecution: (
    input: ExecuteAskHumanExecutionInput,
    dependencies?: ExecuteAskHumanExecutionDependencies
  ) => Promise<ExecuteAskHumanExecutionResult>;
  finalizeAskHumanFlow: (
    input: FinalizeAskHumanFlowInput,
    dependencies?: FinalizeAskHumanFlowDependencies
  ) => Promise<RunAskHumanFlowResult>;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: FinalizeAskHumanFlowDependencies["resolveDeliveryMessageRef"];
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export type RunAskHumanFlowFn = (
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies
) => Promise<RunAskHumanFlowResult>;
