import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import { readRuntimeSessionsRegistry } from "../../defaults/runtimeSessions/runtimeSessionsDefaults.js";

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
