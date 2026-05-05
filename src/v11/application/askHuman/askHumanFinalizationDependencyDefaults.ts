import { basename, dirname, join } from "node:path";

import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type {
  DeliveryAck,
  ResolveDeliveryMessageRefInput
} from "../../shared/ports/tmuxDelivery.js";

type AskHumanFinalizationDefaultsModule = typeof import(
  "../../defaults/askHuman/askHumanFinalizationDefaults.js"
);

let askHumanFinalizationDefaultsModulePromise:
  | Promise<AskHumanFinalizationDefaultsModule>
  | undefined;

function getAskHumanFinalizationDefaultsModulePath(): string {
  return [
    "..",
    "..",
    "defaults",
    "askHuman",
    "askHumanFinalizationDefaults.js"
  ].join("/");
}

async function loadAskHumanFinalizationDefaultsModule():
  Promise<AskHumanFinalizationDefaultsModule> {
  askHumanFinalizationDefaultsModulePromise ??=
    import(getAskHumanFinalizationDefaultsModulePath()) as Promise<
      AskHumanFinalizationDefaultsModule
    >;
  return askHumanFinalizationDefaultsModulePromise;
}

const { askHumanFinalizationDefaults } =
  await loadAskHumanFinalizationDefaultsModule();

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

export const askHumanFinalizationDependencyDefaults = {
  emitDeliveryNotificationAck: async (
    input: Parameters<
      typeof askHumanFinalizationDefaults.emitDeliveryNotificationAck
    >[0]
  ): Promise<DeliveryAck> =>
    askHumanFinalizationDefaults.emitDeliveryNotificationAck(input),
  emitBubbleNotification:
    askHumanFinalizationDefaults.emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const;
