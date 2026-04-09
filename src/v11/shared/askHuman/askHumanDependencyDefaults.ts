import { basename, dirname, join } from "node:path";

import { applyStateTransition } from "../../domain/state/machine.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort,
  ResolveAskHumanDeliveryMessageRefInput,
  ResolveAskHumanDeliveryMessageRefPort
} from "./askHumanDeliveryPortsContract.js";
import type {
  EnsureAskHumanBubbleInstanceIdentity,
  ResolveAskHumanBubbleFromWorkspaceCwd
} from "./askHumanRoutingPreparationDependencyResolutionContract.js";

type CoreAskHumanDependencyDefaults =
  typeof import("../../../core/agent/askHumanDefaults.js").askHumanDependencyDefaults;

let coreAskHumanDependencyDefaultsPromise:
  | Promise<CoreAskHumanDependencyDefaults>
  | undefined;

async function loadCoreAskHumanDependencyDefaults(): Promise<CoreAskHumanDependencyDefaults> {
  coreAskHumanDependencyDefaultsPromise ??= import(
    "../../../core/agent/askHumanDefaults.js"
  ).then(({ askHumanDependencyDefaults }) => askHumanDependencyDefaults);
  return coreAskHumanDependencyDefaultsPromise;
}

async function resolveBubbleFromWorkspaceCwd(
  ...args: Parameters<ResolveAskHumanBubbleFromWorkspaceCwd>
): Promise<Awaited<ReturnType<ResolveAskHumanBubbleFromWorkspaceCwd>>> {
  const defaults = await loadCoreAskHumanDependencyDefaults();
  return defaults.routingPreparation.resolveBubbleFromWorkspaceCwd(...args);
}

async function ensureBubbleInstanceIdForMutation(
  ...args: Parameters<EnsureAskHumanBubbleInstanceIdentity>
): Promise<Awaited<ReturnType<EnsureAskHumanBubbleInstanceIdentity>>> {
  const defaults = await loadCoreAskHumanDependencyDefaults();
  return defaults.routingPreparation.ensureBubbleInstanceIdForMutation(...args);
}

async function emitTmuxDeliveryNotification(
  ...args: Parameters<EmitAskHumanTmuxDeliveryNotificationPort>
): Promise<Awaited<ReturnType<EmitAskHumanTmuxDeliveryNotificationPort>>> {
  const defaults = await loadCoreAskHumanDependencyDefaults();
  return defaults.finalization.emitTmuxDeliveryNotification(...args);
}

async function emitBubbleNotification(
  ...args: Parameters<EmitAskHumanBubbleNotificationPort>
): Promise<Awaited<ReturnType<EmitAskHumanBubbleNotificationPort>>> {
  const defaults = await loadCoreAskHumanDependencyDefaults();
  return defaults.finalization.emitBubbleNotification(...args);
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

export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;

export const askHumanFinalizationDependencyDefaults = {
  emitTmuxDeliveryNotification,
  emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const;
