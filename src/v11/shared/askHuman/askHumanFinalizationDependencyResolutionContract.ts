import type { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort,
  ResolveAskHumanDeliveryMessageRefPort
} from "./askHumanDeliveryPortsContract.js";

export interface ResolveAskHumanFinalizationDependenciesInput {
  emitTmuxDeliveryNotification?:
    | EmitAskHumanTmuxDeliveryNotificationPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  resolveDeliveryMessageRef?:
    | ResolveAskHumanDeliveryMessageRefPort
    | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | typeof emitBubbleLifecycleEventBestEffort
    | undefined;
}

export interface ResolvedAskHumanFinalizationDependencies {
  emitTmuxDeliveryNotification: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveAskHumanDeliveryMessageRefPort;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
}
