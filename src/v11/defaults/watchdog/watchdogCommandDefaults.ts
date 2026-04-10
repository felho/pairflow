import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification,
  retryStuckAgentInput
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { appendWatchdogTrace } from "../../infrastructure/artifact/watchdog/watchdogTraceStore.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { appendProtocolEnvelope } from "../../shared/transcript/transcriptDependencyDefaults.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import { readRuntimeSessionsRegistry } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { runTmux } from "../tmux/tmuxRunnerDefaults.js";
import {
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity
} from "./watchdogPaneActivityDefaults.js";

export const watchdogCommandDefaults = {
  appendProtocolEnvelope,
  appendWatchdogTrace,
  emitBubbleNotification,
  emitTmuxDeliveryNotification,
  retryStuckAgentInput,
  readStateSnapshot,
  readRuntimeSessionsRegistry,
  readWatchdogPaneActivity,
  resolveBubbleById,
  runTmux,
  writeStateSnapshot,
  writeWatchdogPaneActivity
} as const;
