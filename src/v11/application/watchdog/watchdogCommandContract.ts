import type { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import type {
  emitTmuxDeliveryNotification
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import type {
  readStateSnapshot
} from "../../infrastructure/state/stateStore.js";
import type {
  recoverMetaReviewGateFromSnapshot
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type {
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity
} from "../../shared/watchdog/watchdogPaneActivityStore.js";
import type {
  sampleWatchdogPaneActivity
} from "../../shared/watchdog/watchdogPaneActivitySampler.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface BubbleWatchdogInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface BubbleWatchdogDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  readStateSnapshot?: typeof readStateSnapshot;
  recoverMetaReviewGateFromSnapshot?: typeof recoverMetaReviewGateFromSnapshot;
  readWatchdogPaneActivity?: typeof readWatchdogPaneActivity;
  writeWatchdogPaneActivity?: typeof writeWatchdogPaneActivity;
  sampleWatchdogPaneActivity?: typeof sampleWatchdogPaneActivity;
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
