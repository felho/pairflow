import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const startCommandContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleById
} as const;
