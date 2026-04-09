import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type { ReadRuntimeSessionsRegistryPort } from "../ports/runtimeSessions.js";

let bubbleLookupModulePromise:
  | Promise<{ resolveBubbleById: ResolveBubbleByIdPort }>
  | undefined;
let runtimeSessionsModulePromise:
  | Promise<{ readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort }>
  | undefined;

async function loadBubbleLookupModule(): Promise<{
  resolveBubbleById: ResolveBubbleByIdPort;
}> {
  bubbleLookupModulePromise ??= import(
    "../../../core/bubble/bubbleLookup.js"
  ).then(({ resolveBubbleById }) => ({ resolveBubbleById }));
  return bubbleLookupModulePromise;
}

async function loadRuntimeSessionsModule(): Promise<{
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
}> {
  runtimeSessionsModulePromise ??= import(
    "../../../core/runtime/sessionsRegistry.js"
  ).then(({ readRuntimeSessionsRegistry }) => ({ readRuntimeSessionsRegistry }));
  return runtimeSessionsModulePromise;
}

async function resolveBubbleById(
  ...args: Parameters<ResolveBubbleByIdPort>
): Promise<Awaited<ReturnType<ResolveBubbleByIdPort>>> {
  const { resolveBubbleById } = await loadBubbleLookupModule();
  return resolveBubbleById(...args);
}

async function readRuntimeSessionsRegistry(
  ...args: Parameters<ReadRuntimeSessionsRegistryPort>
): Promise<Awaited<ReturnType<ReadRuntimeSessionsRegistryPort>>> {
  const { readRuntimeSessionsRegistry } = await loadRuntimeSessionsModule();
  return readRuntimeSessionsRegistry(...args);
}

export const metaReviewReadDefaults = {
  readStateSnapshot,
  resolveBubbleById
} as const;

export const metaReviewCommandSubmitDefaults = {
  readRuntimeSessionsRegistry,
  readStateSnapshot,
  resolveBubbleById
} as const;

export const metaReviewLiveRunDefaults = {
  appendProtocolEnvelope,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} as const;
