import { ensureBubbleInstanceIdForMutation } from "../bubbleIdentity/bubbleIdentityDefaults.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";

export const startCommandContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleById
} as const;
