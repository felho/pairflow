import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import {
  resolveBubbleById as coreResolveBubbleById
} from "../../../core/bubble/bubbleLookup.js";
import {
  readRuntimeSessionsRegistry as coreReadRuntimeSessionsRegistry
} from "../../../core/runtime/sessionsRegistry.js";

type ResolveBubbleByIdPort = typeof coreResolveBubbleById;
type ReadRuntimeSessionsRegistryPort = typeof coreReadRuntimeSessionsRegistry;

async function resolveBubbleById(
  ...args: Parameters<ResolveBubbleByIdPort>
): Promise<Awaited<ReturnType<ResolveBubbleByIdPort>>> {
  return coreResolveBubbleById(...args);
}

async function readRuntimeSessionsRegistry(
  ...args: Parameters<ReadRuntimeSessionsRegistryPort>
): Promise<Awaited<ReturnType<ReadRuntimeSessionsRegistryPort>>> {
  return coreReadRuntimeSessionsRegistry(...args);
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
