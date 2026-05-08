import type { AskHumanDeliveryResult } from "../mutation/askHumanFlowContract.js";
import type {
  EmitOptionalAskHumanNotificationsDependencies,
  EmitOptionalAskHumanNotificationsInput
} from "./askHumanNotificationEmissionContract.js";
import type { DeliveryAck } from "../../../../ports/tmuxDelivery.js";

function describeDetachedBubbleNotificationFailure(error: unknown): void {
  void error;
  // Intentional best-effort detach: bubble notifications are UX-only and must
  // not mutate ask-human protocol completion if they fail after dispatch.
}

function buildUnexpectedAskHumanDeliveryFailureResult(
  error: unknown
): DeliveryAck {
  const detail =
    error instanceof Error && error.message.trim().length > 0
      ? error.message.trim()
      : "unknown delivery error";
  return {
    status: "rejected",
    message: `delivery notification failed: ${detail}`,
    reason: "command_failed",
    reason_code: "DELIVERY_ACK_REJECTED"
  };
}

function normalizeAskHumanDeliveryAck(deliveryAck: DeliveryAck): DeliveryAck {
  if (
    deliveryAck.status === "rejected"
    && deliveryAck.reason === "no_runtime_session"
    && deliveryAck.deliveryTargetReasonCode === undefined
  ) {
    return {
      ...deliveryAck,
      // Ask-human notifications still target the human/status lane even when
      // the runtime session is absent, so preserve the historical reason code
      // expected by the V11 ask-human contract and local CI.
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_ABSENT"
    };
  }
  return deliveryAck;
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
  ).catch((error: unknown) => {
    describeDetachedBubbleNotificationFailure(error);
    return undefined;
  });
  const deliveryResult = normalizeAskHumanDeliveryAck(await dependencies.emitDeliveryNotificationAck({
    bubbleId: input.bubbleId,
    bubbleConfig: input.bubbleConfig,
    sessionsPath: input.sessionsPath,
    envelope: input.envelope,
    recipientRole: "status",
    messageRef: input.messageRef
  }).catch((error) => buildUnexpectedAskHumanDeliveryFailureResult(error)));
  void bubbleNotificationPromise;

  return {
    deliveryResult
  };
}
