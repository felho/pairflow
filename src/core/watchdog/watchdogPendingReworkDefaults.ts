import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveDeliveryMessageRef } from "../runtime/tmuxDelivery.js";

export const watchdogPendingReworkDefaults = {
  ensureBubbleInstanceIdForMutation,
  resolveDeliveryMessageRef
} as const;
