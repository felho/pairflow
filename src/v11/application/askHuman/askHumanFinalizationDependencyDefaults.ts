import { basename, dirname, join } from "node:path";

import { askHumanFinalizationDefaults } from "../../defaults/askHuman/askHumanFinalizationDefaults.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type {
  AskHumanEmitTmuxDeliveryNotificationResult,
  ResolveAskHumanDeliveryMessageRefInput
} from "../../shared/askHuman/askHumanDeliveryPortsContract.js";
import type { EmitTmuxDeliveryNotificationResult } from "../../shared/delivery/tmuxDeliveryContract.js";

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

function mapTmuxDeliveryResultToAskHumanResult(
  result: EmitTmuxDeliveryNotificationResult
): AskHumanEmitTmuxDeliveryNotificationResult {
  return {
    status: result.delivered ? "accepted" : "rejected",
    ...result
  };
}

export const askHumanFinalizationDependencyDefaults = {
  emitTmuxDeliveryNotification: async (
    input: Parameters<
      typeof askHumanFinalizationDefaults.emitTmuxDeliveryNotification
    >[0]
  ) =>
    mapTmuxDeliveryResultToAskHumanResult(
      await askHumanFinalizationDefaults.emitTmuxDeliveryNotification(input)
    ),
  emitBubbleNotification:
    askHumanFinalizationDefaults.emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const;
