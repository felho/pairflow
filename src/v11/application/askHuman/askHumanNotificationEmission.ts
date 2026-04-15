import type { AskHumanDeliveryResult } from "../../shared/askHuman/askHumanFlowContract.js";
import type {
  EmitOptionalAskHumanNotificationsDependencies,
  EmitOptionalAskHumanNotificationsInput
} from "../../shared/askHuman/askHumanNotificationEmissionContract.js";
import type { AskHumanEmitTmuxDeliveryNotificationResult } from "../../shared/askHuman/askHumanDeliveryPortsContract.js";

function describeDetachedBubbleNotificationFailure(error: unknown): void {
  void error;
  // Intentional best-effort detach: bubble notifications are UX-only and must
  // not mutate ask-human protocol completion if they fail after dispatch.
}

function buildUnexpectedAskHumanDeliveryFailureResult(
  error: unknown
): AskHumanEmitTmuxDeliveryNotificationResult {
  const detail =
    error instanceof Error && error.message.trim().length > 0
      ? error.message.trim()
      : "unknown tmux delivery error";
  return {
    status: "rejected",
    delivered: false,
    message: `tmux delivery notification failed: ${detail}`,
    reason: "tmux_send_failed",
    reason_code: "DELIVERY_ACK_REJECTED"
  };
}

export async function emitOptionalAskHumanNotifications(
  input: EmitOptionalAskHumanNotificationsInput,
  dependencies: EmitOptionalAskHumanNotificationsDependencies
): Promise<AskHumanDeliveryResult> {
  // Optional UX signal only: the canonical delivery result comes from the tmux
  // delivery boundary, so bubble notifications stay detached and must not gate
  // ask-human finalization if they fail or resolve later.
  const bubbleNotificationPromise = dependencies.emitBubbleNotification(
    input.bubbleConfig,
    "waiting-human"
  ).catch((error) => {
    describeDetachedBubbleNotificationFailure(error);
    return undefined;
  });
  const deliveryResult = await dependencies.emitTmuxDeliveryNotification({
    bubbleId: input.bubbleId,
    bubbleConfig: input.bubbleConfig,
    sessionsPath: input.sessionsPath,
    envelope: input.envelope,
    messageRef: input.messageRef
  }).catch((error) => buildUnexpectedAskHumanDeliveryFailureResult(error));
  void bubbleNotificationPromise;

  return {
    deliveryResult
  };
}
