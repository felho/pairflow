import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const startCommandContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleById
} as const;
