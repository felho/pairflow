import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import {
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity
} from "./watchdogPaneActivityStore.js";
import { appendWatchdogTrace } from "./watchdogTraceStore.js";

export const watchdogCommandDefaults = {
  appendProtocolEnvelope,
  appendWatchdogTrace,
  emitBubbleNotification,
  emitTmuxDeliveryNotification,
  readStateSnapshot,
  readWatchdogPaneActivity,
  resolveBubbleById,
  writeStateSnapshot,
  writeWatchdogPaneActivity
} as const;
