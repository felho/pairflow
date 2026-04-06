import type { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export interface AskHumanFlowRuntimeDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
}
