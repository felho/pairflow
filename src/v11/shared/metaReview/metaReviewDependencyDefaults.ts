import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";

type ResolveBubbleByIdPort =
  typeof import("../../../core/bubble/bubbleLookup.js").resolveBubbleById;
type ReadRuntimeSessionsRegistryPort =
  typeof import("../../../core/runtime/sessionsRegistry.js").readRuntimeSessionsRegistry;

let bubbleLookupModulePromise:
  | Promise<typeof import("../../../core/bubble/bubbleLookup.js")>
  | undefined;
let runtimeSessionsRegistryModulePromise:
  | Promise<typeof import("../../../core/runtime/sessionsRegistry.js")>
  | undefined;

async function loadBubbleLookupModule() {
  bubbleLookupModulePromise ??= import("../../../core/bubble/bubbleLookup.js");
  return bubbleLookupModulePromise;
}

async function loadRuntimeSessionsRegistryModule() {
  runtimeSessionsRegistryModulePromise ??= import(
    "../../../core/runtime/sessionsRegistry.js"
  );
  return runtimeSessionsRegistryModulePromise;
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
  const { readRuntimeSessionsRegistry } = await loadRuntimeSessionsRegistryModule();
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
