import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import { readRuntimeSessionsRegistry } from "./sessionsRegistry.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const metaReviewCommandSubmitDefaults = {
  readRuntimeSessionsRegistry,
  readStateSnapshot,
  resolveBubbleById
} as const;
