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

let coreAskHumanFinalizationDefaultsPromise:
  | Promise<CoreAskHumanFinalizationDefaults>
  | undefined;

async function loadCoreAskHumanFinalizationDefaults(): Promise<CoreAskHumanFinalizationDefaults> {
  coreAskHumanFinalizationDefaultsPromise ??= import(
    "../../../core/agent/askHumanDefaults.js"
  ).then(({ askHumanDependencyDefaults }) => ({
    emitTmuxDeliveryNotification:
      askHumanDependencyDefaults.finalization.emitTmuxDeliveryNotification,
    emitBubbleNotification:
      askHumanDependencyDefaults.finalization.emitBubbleNotification
  }));
  return coreAskHumanFinalizationDefaultsPromise;
}

async function emitTmuxDeliveryNotification(
  ...args: Parameters<CoreAskHumanFinalizationDefaults["emitTmuxDeliveryNotification"]>
): Promise<
  Awaited<ReturnType<CoreAskHumanFinalizationDefaults["emitTmuxDeliveryNotification"]>>
> {
  const defaults = await loadCoreAskHumanFinalizationDefaults();
  return defaults.emitTmuxDeliveryNotification(...args);
}

async function emitBubbleNotification(
  ...args: Parameters<CoreAskHumanFinalizationDefaults["emitBubbleNotification"]>
): Promise<
  Awaited<ReturnType<CoreAskHumanFinalizationDefaults["emitBubbleNotification"]>>
> {
  const defaults = await loadCoreAskHumanFinalizationDefaults();
  return defaults.emitBubbleNotification(...args);
}

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
  emitTmuxDeliveryNotification,
  emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const;
