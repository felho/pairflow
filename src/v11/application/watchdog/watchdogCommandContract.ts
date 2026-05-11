import type { AgentRole } from "../../../contracts/kernel/agentIdentity.js";
import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import type { EmitBubbleNotificationPort } from "../../ports/notifications.js";
import type { AppendProtocolEnvelopePort } from "../../ports/transcript.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort,
  RetryStuckAgentInputPort
} from "../../ports/tmuxDelivery.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type { ReadRuntimeSessionsRegistryPort } from "../../ports/runtimeSessions.js";
import type { TmuxRunner } from "../../ports/tmuxSessions.js";
import type {
  ReadWatchdogPaneActivityPort,
  WriteWatchdogPaneActivityPort
} from "../../ports/watchdogPaneActivity.js";
import type { AppendWatchdogTracePort } from "../../ports/watchdogTrace.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../ports/bubbleIdentity.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { BubbleStateSnapshot } from "../../domain/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export type PaneActivitySampleResult =
  | {
      status: "sampled";
      sampled_at: string;
      pane_hash: string;
      changed: boolean;
      session_name: string;
      target_pane: string;
    }
  | {
      status: "no_session";
      sampled_at: string;
      error: string;
    }
  | {
      status: "pane_unreadable";
      sampled_at: string;
      error: string;
      session_name: string;
      target_pane: string;
    };

export type SampleWatchdogPaneActivityFn = (input: {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  activeRole: AgentRole;
  readSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  runner: TmuxRunner;
  priorPaneHash?: string;
  now?: Date;
}) => Promise<PaneActivitySampleResult>;

export interface BubbleWatchdogInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface BubbleWatchdogDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  emitBubbleNotification: EmitBubbleNotificationPort;
  readStateSnapshot: ReadStateSnapshotPort;
  writeStateSnapshot: WriteStateSnapshotPort;
  readWatchdogPaneActivity: ReadWatchdogPaneActivityPort;
  writeWatchdogPaneActivity: WriteWatchdogPaneActivityPort;
  appendWatchdogTrace: AppendWatchdogTracePort;
  resolveBubbleById: ResolveBubbleByIdPort;
  sampleWatchdogPaneActivity?: SampleWatchdogPaneActivityFn;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  runTmux: TmuxRunner;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  retryStuckAgentInput: RetryStuckAgentInputPort;
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
