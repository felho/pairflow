import type {
  AppendProtocolEnvelopeResult,
  AppendProtocolEnvelopePort
} from "../../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type { applyStateTransition } from "../../domain/state/machine.js";
import type {
  EmitAskHumanBubbleNotificationPort,
} from "./askHumanDeliveryPortsContract.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";
import type { AskHumanActivationProvenance } from "./askHumanCommandContract.js";
import type {
  DeliveryAck,
  DeliveryTargetReasonCode,
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";

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
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  applyStateTransition?: typeof applyStateTransition;
}

export interface FinalizeAskHumanFlowInput {
  now: Date;
  routing: AskHumanRoutingContext;
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

export interface FinalizeAskHumanFlowDependencies {
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  emitBubbleLifecycleEventBestEffort?: EmitBubbleLifecycleEventBestEffortPort;
}

export interface RunAskHumanFlowResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
  activation?: AskHumanActivationProvenance;
  delivery?: {
    status: DeliveryAck["status"];
    message?: string;
    reason?: Extract<DeliveryAck, { status: "rejected" }>["reason"];
    reason_code?: Extract<DeliveryAck, { status: "rejected" }>["reason_code"];
    deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  };
}

export interface AskHumanDeliveryResult {
  deliveryResult: DeliveryAck | undefined;
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
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  applyStateTransition?: typeof applyStateTransition;
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef?: FinalizeAskHumanFlowDependencies["resolveDeliveryMessageRef"];
  emitBubbleLifecycleEventBestEffort?: EmitBubbleLifecycleEventBestEffortPort;
}

export type RunAskHumanFlowFn = (
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies
) => Promise<RunAskHumanFlowResult>;
