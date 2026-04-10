import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import {
  emitTmuxDeliveryNotification,
  retryStuckAgentInput
} from "../../v11/infrastructure/channel/tmux/tmuxDelivery.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import {
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity
} from "../../v11/defaults/watchdog/watchdogPaneActivityDefaults.js";
import { appendWatchdogTrace } from "../../v11/infrastructure/artifact/watchdog/watchdogTraceStore.js";
import { emitBubbleNotification } from "../../v11/infrastructure/channel/notifications.js";

export const watchdogCommandDefaults = {
  appendProtocolEnvelope,
  appendWatchdogTrace,
  emitBubbleNotification,
  emitTmuxDeliveryNotification,
  retryStuckAgentInput,
  readStateSnapshot,
  readWatchdogPaneActivity,
  resolveBubbleById,
  writeStateSnapshot,
  writeWatchdogPaneActivity
} as const;
