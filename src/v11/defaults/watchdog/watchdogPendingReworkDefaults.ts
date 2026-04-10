import { ensureBubbleInstanceIdForMutation } from "../bubbleIdentity/bubbleIdentityDefaults.js";
import { resolveDeliveryMessageRef } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export const watchdogPendingReworkDefaults = {
  ensureBubbleInstanceIdForMutation,
  resolveDeliveryMessageRef
} as const;
