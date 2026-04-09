import { basename, dirname, join } from "node:path";

import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort,
  ResolveAskHumanDeliveryMessageRefInput
} from "../../shared/askHuman/askHumanDeliveryPortsContract.js";

interface CoreAskHumanFinalizationDefaults {
  emitTmuxDeliveryNotification: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification: EmitAskHumanBubbleNotificationPort;
}

const coreAskHumanFinalizationDefaultsPromise: Promise<
  CoreAskHumanFinalizationDefaults
> = import(
    "../../../core/agent/askHumanDefaults.js"
  ).then(({ askHumanDependencyDefaults }) => ({
    emitTmuxDeliveryNotification:
      askHumanDependencyDefaults.finalization.emitTmuxDeliveryNotification,
    emitBubbleNotification:
      askHumanDependencyDefaults.finalization.emitBubbleNotification
  }));

const coreAskHumanFinalizationDefaults =
  await coreAskHumanFinalizationDefaultsPromise;

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
  input: ResolveAskHumanDeliveryMessageRefInput
): string {
  return (
    input.messageRef ??
    input.envelope.refs[0] ??
    buildTranscriptFallbackRef(input.bubbleId, input.sessionsPath, input.envelope.id)
  );
}

export const askHumanFinalizationDependencyDefaults = {
  emitTmuxDeliveryNotification:
    coreAskHumanFinalizationDefaults.emitTmuxDeliveryNotification,
  emitBubbleNotification:
    coreAskHumanFinalizationDefaults.emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const;
