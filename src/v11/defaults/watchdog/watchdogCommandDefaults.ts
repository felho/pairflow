import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitDeliveryNotificationAck,
  retryStuckAgentInput
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { appendWatchdogTrace } from "../../infrastructure/artifact/watchdog/watchdogTraceStore.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { readRuntimeSessionsRegistry } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { runTmux } from "../../infrastructure/channel/tmux/tmuxRunner.js";
import {
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity
} from "./watchdogPaneActivityDefaults.js";

export const watchdogCommandDefaults = {
  appendProtocolEnvelope,
  appendWatchdogTrace,
  emitBubbleNotification,
  emitDeliveryNotificationAck,
  retryStuckAgentInput,
  readStateSnapshot,
  readRuntimeSessionsRegistry,
  readWatchdogPaneActivity,
  resolveBubbleById,
  runTmux,
  writeStateSnapshot,
  writeWatchdogPaneActivity
} as const;
