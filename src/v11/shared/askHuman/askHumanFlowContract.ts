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
  AskHumanEmitTmuxDeliveryNotificationResult,
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort,
  ResolveAskHumanDeliveryMessageRefPort
} from "./askHumanDeliveryPortsContract.js";
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
  delivery?: {
    delivered: boolean;
    message?: string;
    reason?: Exclude<
      AskHumanEmitTmuxDeliveryNotificationResult["reason"],
      undefined
    >;
    deliveryTargetReasonCode?: AskHumanDeliveryTargetReasonCode;
  };
}

export interface AskHumanDeliveryResult {
  deliveryResult: AskHumanEmitTmuxDeliveryNotificationResult | undefined;
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
  emitTmuxDeliveryNotification?: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef?: FinalizeAskHumanFlowDependencies["resolveDeliveryMessageRef"];
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export type RunAskHumanFlowFn = (
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies
) => Promise<RunAskHumanFlowResult>;
