import type { EmitBubbleNotificationPort } from "../../shared/ports/notifications.js";
import type { AppendProtocolEnvelopePort } from "../../shared/ports/transcript.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort,
  RetryStuckAgentInputPort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type { ReadRuntimeSessionsRegistryPort } from "../../shared/ports/runtimeSessions.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";
import type {
  ReadWatchdogPaneActivityPort,
  WriteWatchdogPaneActivityPort
} from "../../shared/ports/watchdogPaneActivity.js";
import type { AppendWatchdogTracePort } from "../../shared/ports/watchdogTrace.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type {
  sampleWatchdogPaneActivity
} from "./watchdogPaneActivitySampler.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface BubbleWatchdogInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface BubbleWatchdogDependencies {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitBubbleNotificationPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  readWatchdogPaneActivity?: ReadWatchdogPaneActivityPort;
  writeWatchdogPaneActivity?: WriteWatchdogPaneActivityPort;
  appendWatchdogTrace?: AppendWatchdogTracePort;
  sampleWatchdogPaneActivity?: typeof sampleWatchdogPaneActivity;
  readRuntimeSessionsRegistry?: ReadRuntimeSessionsRegistryPort;
  runTmux?: TmuxRunner;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  retryStuckAgentInput?: RetryStuckAgentInputPort;
}

export type BubbleWatchdogNoopReason =
  | "not_monitored"
  | "not_expired"
  | "state_not_running"
  | "rework_intent_applied"
  | "rework_delivery_failed";

export interface BubbleWatchdogResult {
  bubbleId: string;
  escalated: boolean;
  reason: BubbleWatchdogNoopReason | "escalated";
  state: BubbleStateSnapshot;
  envelope?: ProtocolEnvelope | undefined;
  sequence?: number | undefined;
  stuckRetried?: boolean | undefined;
  intentId?: string | undefined;
  deliveryError?: string | undefined;
}
