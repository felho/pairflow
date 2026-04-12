import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { readRuntimeSessionsRegistry } from "../../defaults/runtimeSessions/runtimeSessionsDefaults.js";

export const metaReviewCommandSubmitDefaults = {
  readRuntimeSessionsRegistry,
  readStateSnapshot,
  resolveBubbleById
} as const;
