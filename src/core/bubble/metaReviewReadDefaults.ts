import { resolveBubbleById } from "./bubbleLookup.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const metaReviewReadDefaults = {
  readStateSnapshot,
  resolveBubbleById
} as const;
