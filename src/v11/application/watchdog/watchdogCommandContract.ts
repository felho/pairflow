import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type {
  emitTmuxDeliveryNotification
} from "../../../core/runtime/tmuxDelivery.js";
import type {
  readStateSnapshot
} from "../../../core/state/stateStore.js";
import type {
  recoverMetaReviewGateFromSnapshot
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
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
