import { basename, dirname, join } from "node:path";

import type {
  DeliveryAck,
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefInput
} from "../../shared/ports/tmuxDelivery.js";
import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";

function buildTranscriptFallbackRef(
  bubbleId: string,
  sessionsPath: string,
  messageId: string
): string {
  const pairflowDir = resolvePairflowDirFromSessionsPath(sessionsPath);
  const transcriptPath = join(pairflowDir, "bubbles", bubbleId, "transcript.ndjson");
  return `${transcriptPath}#${messageId}`;
}

function resolvePairflowDirFromSessionsPath(sessionsPath: string): string {
  const match = /^(.*[\\/]\.pairflow)(?:[\\/]|$)/u.exec(sessionsPath);
  if (match?.[1] !== undefined) {
    return match[1];
  }
  const runtimeDir = dirname(sessionsPath);
  if (basename(runtimeDir) === "runtime") {
    return join(dirname(runtimeDir), ".pairflow");
  }
  return join(runtimeDir, ".pairflow");
}

function resolveDeliveryMessageRef(
  input: ResolveDeliveryMessageRefInput
): string {
  return (
    input.messageRef ??
    input.envelope.refs[0] ??
    buildTranscriptFallbackRef(input.bubbleId, input.sessionsPath, input.envelope.id)
  );
}

function emitDeliveryNotificationAck(
  input: Parameters<EmitDeliveryNotificationAckPort>[0]
): Promise<DeliveryAck> {
  return Promise.resolve({
    status: "rejected",
    reason: "no_runtime_session",
    reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE",
    message:
      `No ask-human delivery runtime dependency was provided for ${input.bubbleId}.`
  });
}

function emitBubbleNotification(): Promise<unknown> {
  return Promise.resolve(undefined);
}

function emitBubbleLifecycleEventBestEffort(): Promise<void> {
  return Promise.resolve(undefined);
}

export const askHumanFinalizationDependencyDefaults = {
  emitDeliveryNotificationAck,
  emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const satisfies {
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  emitBubbleNotification: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef: (
    input: ResolveDeliveryMessageRefInput
  ) => string;
  emitBubbleLifecycleEventBestEffort: EmitBubbleLifecycleEventBestEffortPort;
};
