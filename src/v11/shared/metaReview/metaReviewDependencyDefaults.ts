import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type { ReadRuntimeSessionsRegistryPort } from "../ports/runtimeSessions.js";
import { metaReviewReadDefaults as metaReviewReadDefaultsCore } from "../../../core/bubble/metaReviewReadDefaults.js";
import { metaReviewCommandSubmitDefaults as metaReviewCommandSubmitDefaultsCore } from "../../../core/runtime/metaReviewCommandSubmitDefaults.js";
import { metaReviewLiveRunDefaults as metaReviewLiveRunDefaultsCore } from "../../../core/runtime/metaReviewLiveRunDefaults.js";

async function resolveBubbleById(
  ...args: Parameters<ResolveBubbleByIdPort>
): Promise<Awaited<ReturnType<ResolveBubbleByIdPort>>> {
  return metaReviewReadDefaultsCore.resolveBubbleById(...args);
}

async function readRuntimeSessionsRegistry(
  ...args: Parameters<ReadRuntimeSessionsRegistryPort>
): Promise<Awaited<ReturnType<ReadRuntimeSessionsRegistryPort>>> {
  return metaReviewCommandSubmitDefaultsCore.readRuntimeSessionsRegistry(...args);
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
  appendProtocolEnvelope: metaReviewLiveRunDefaultsCore.appendProtocolEnvelope,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} as const;
