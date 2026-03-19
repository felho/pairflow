import type {
  EmitOptionalAskHumanNotificationsDependencies,
  EmitOptionalAskHumanNotificationsInput
} from "./askHumanNotificationEmissionContract.js";

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
