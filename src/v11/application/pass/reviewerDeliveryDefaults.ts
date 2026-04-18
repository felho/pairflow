import { basename, dirname, join } from "node:path";

import type {
  EmitDeliveryNotificationAckPort,
  EmitTmuxDeliveryNotificationPort,
  ResolveDeliveryMessageRefInput,
  ResolveDeliveryMessageRefPort
} from "../../shared/ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../shared/ports/reviewerContext.js";

let reviewerDeliveryDefaultsPromise:
  | Promise<{
      emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
      emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
      refreshReviewerContext: RefreshReviewerContextPort;
    }>
  | undefined;

async function loadReviewerDeliveryDefaults(): Promise<{
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  refreshReviewerContext: RefreshReviewerContextPort;
}> {
  reviewerDeliveryDefaultsPromise ??= import(
    "../../defaults/reviewer/reviewerDeliveryDefaults.js"
  ).then(({ reviewerDeliveryDefaults }) => reviewerDeliveryDefaults);
  return reviewerDeliveryDefaultsPromise;
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

export function resolveDeliveryMessageRef(
  input: ResolveDeliveryMessageRefInput
): string {
  return (
    input.messageRef ??
    input.envelope.refs[0] ??
    buildTranscriptFallbackRef(input.bubbleId, input.sessionsPath, input.envelope.id)
  );
}

export async function emitTmuxDeliveryNotification(
  ...args: Parameters<EmitTmuxDeliveryNotificationPort>
): Promise<Awaited<ReturnType<EmitTmuxDeliveryNotificationPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.emitTmuxDeliveryNotification(...args);
}

export async function emitDeliveryNotificationAck(
  ...args: Parameters<EmitDeliveryNotificationAckPort>
): Promise<Awaited<ReturnType<EmitDeliveryNotificationAckPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.emitDeliveryNotificationAck(...args);
}

export async function refreshReviewerContext(
  ...args: Parameters<RefreshReviewerContextPort>
): Promise<Awaited<ReturnType<RefreshReviewerContextPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.refreshReviewerContext(...args);
}

export const reviewerDeliveryDefaults = {
  emitDeliveryNotificationAck,
  emitTmuxDeliveryNotification,
  refreshReviewerContext,
  resolveDeliveryMessageRef
} as const satisfies {
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  refreshReviewerContext: RefreshReviewerContextPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
};
