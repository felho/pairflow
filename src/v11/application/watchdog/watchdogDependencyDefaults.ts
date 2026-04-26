import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
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

interface CoreWatchdogCommandDefaults {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  appendWatchdogTrace: AppendWatchdogTracePort;
  emitBubbleNotification: EmitBubbleNotificationPort;
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  retryStuckAgentInput: RetryStuckAgentInputPort;
  readStateSnapshot: ReadStateSnapshotPort;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  readWatchdogPaneActivity: ReadWatchdogPaneActivityPort;
  resolveBubbleById: ResolveBubbleByIdPort;
  runTmux: TmuxRunner;
  writeStateSnapshot: WriteStateSnapshotPort;
  writeWatchdogPaneActivity: WriteWatchdogPaneActivityPort;
}

interface CoreWatchdogPendingReworkDefaults {
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}

let watchdogCommandDefaultsPromise:
  | Promise<CoreWatchdogCommandDefaults>
  | undefined;

let watchdogPendingReworkDefaultsPromise:
  | Promise<CoreWatchdogPendingReworkDefaults>
  | undefined;

export async function loadWatchdogCommandDefaults(): Promise<CoreWatchdogCommandDefaults> {
  const defaultsPromise =
    watchdogCommandDefaultsPromise ??= import(
    "../../defaults/watchdog/watchdogCommandDefaults.js"
  ).then(({ watchdogCommandDefaults }) => watchdogCommandDefaults);
  return defaultsPromise;
}

export async function loadWatchdogPendingReworkDefaults(): Promise<CoreWatchdogPendingReworkDefaults> {
  const defaultsPromise =
    watchdogPendingReworkDefaultsPromise ??= import(
    "../../defaults/watchdog/watchdogPendingReworkDefaults.js"
  ).then(({ watchdogPendingReworkDefaults }) => watchdogPendingReworkDefaults);
  return defaultsPromise;
}
