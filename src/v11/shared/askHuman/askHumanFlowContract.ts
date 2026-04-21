import type {
  AppendProtocolEnvelopeResult,
  AppendProtocolEnvelopePort
} from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type { applyStateTransition } from "../../domain/state/machine.js";
import type {
  AskHumanDeliveryTargetReasonCode,
  AskHumanDeliveryAck,
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanDeliveryNotificationAckPort,
  EmitAskHumanTmuxDeliveryNotificationPort,
  ResolveAskHumanDeliveryMessageRefPort
} from "./askHumanDeliveryPortsContract.js";
import type { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";
import type { AskHumanActivationProvenance } from "./askHumanCommandContract.js";

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
  emitDeliveryNotificationAck?: EmitAskHumanDeliveryNotificationAckPort;
  emitTmuxDeliveryNotification?: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef?: ResolveAskHumanDeliveryMessageRefPort;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export interface RunAskHumanFlowResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
  activation?: AskHumanActivationProvenance;
  delivery?: {
    status: AskHumanDeliveryAck["status"];
    delivered: boolean;
    message?: string;
    reason?: Extract<AskHumanDeliveryAck, { status: "rejected" }>["reason"];
    reason_code?: Extract<AskHumanDeliveryAck, { status: "rejected" }>["reason_code"];
    deliveryTargetReasonCode?: AskHumanDeliveryTargetReasonCode;
  };
}

export interface AskHumanDeliveryResult {
  deliveryResult: AskHumanDeliveryAck | undefined;
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
  emitDeliveryNotificationAck?: EmitAskHumanDeliveryNotificationAckPort;
  emitTmuxDeliveryNotification?: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef?: FinalizeAskHumanFlowDependencies["resolveDeliveryMessageRef"];
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export type RunAskHumanFlowFn = (
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies
) => Promise<RunAskHumanFlowResult>;
