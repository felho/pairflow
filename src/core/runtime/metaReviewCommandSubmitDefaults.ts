import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import { readRuntimeSessionsRegistry } from "../../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const metaReviewCommandSubmitDefaults = {
  readRuntimeSessionsRegistry,
  readStateSnapshot,
  resolveBubbleById
} as const;
