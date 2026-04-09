import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import type { ReadRuntimeSessionsRegistryPort } from "../ports/runtimeSessions.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { metaReviewCommandSubmitDefaults as metaReviewCommandSubmitDefaultsCore } from "../../../core/runtime/metaReviewCommandSubmitDefaults.js";
import { metaReviewLiveRunDefaults as metaReviewLiveRunDefaultsCore } from "../../../core/runtime/metaReviewLiveRunDefaults.js";

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
