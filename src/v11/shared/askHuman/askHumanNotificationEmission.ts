import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface EmitOptionalAskHumanNotificationsInput {
  bubbleId: string;
  bubbleConfig: Parameters<typeof emitBubbleNotification>[0];
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef: string;
}

export interface EmitOptionalAskHumanNotificationsDependencies {
  emitTmuxDeliveryNotification: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification: typeof emitBubbleNotification;
}

export function emitOptionalAskHumanNotifications(
  input: EmitOptionalAskHumanNotificationsInput,
  dependencies: EmitOptionalAskHumanNotificationsDependencies
): void {
  // Optional UX signal; never block protocol/state progression on notification failure.
  void dependencies.emitTmuxDeliveryNotification({
    bubbleId: input.bubbleId,
    bubbleConfig: input.bubbleConfig,
    sessionsPath: input.sessionsPath,
    envelope: input.envelope,
    messageRef: input.messageRef
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void dependencies.emitBubbleNotification(input.bubbleConfig, "waiting-human");
}
