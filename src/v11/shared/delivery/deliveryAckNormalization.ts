import type {
  DeliveryAck,
  DeliveryAckLike,
  DeliveryAckReasonCode,
  DeliveryFailureReason
} from "../ports/tmuxDelivery.js";

function resolveDeliveryAckReasonCode(
  reason: DeliveryFailureReason
): DeliveryAckReasonCode {
  switch (reason) {
    case "no_runtime_session":
    case "registry_read_failed":
      return "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE";
    case "unsupported_recipient":
      return "DELIVERY_ACK_TARGET_UNSUPPORTED";
    case "delivery_unconfirmed":
    case "tmux_send_failed":
      return "DELIVERY_ACK_REJECTED";
  }
}

function normalizeRejectedDeliveryAck(input: {
  message: string;
  reason?: DeliveryFailureReason;
  reason_code?: DeliveryAckReasonCode;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: DeliveryAckLike["deliveryTargetReasonCode"];
}): Extract<DeliveryAck, { status: "rejected" }> {
  const reason = input.reason ?? "tmux_send_failed";

  return {
    status: "rejected",
    message: input.message,
    reason,
    reason_code: input.reason_code ?? resolveDeliveryAckReasonCode(reason),
    ...(input.sessionName !== undefined
      ? { sessionName: input.sessionName }
      : {}),
    ...(input.targetPaneIndex !== undefined
      ? { targetPaneIndex: input.targetPaneIndex }
      : {}),
    ...(input.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
      : {})
  };
}

function normalizeAcceptedDeliveryAck(input: {
  message: string;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: DeliveryAckLike["deliveryTargetReasonCode"];
}): DeliveryAck {
  if (
    input.sessionName !== undefined &&
    input.targetPaneIndex !== undefined
  ) {
    return {
      status: "accepted",
      sessionName: input.sessionName,
      targetPaneIndex: input.targetPaneIndex,
      message: input.message,
      ...(input.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
        : {})
    };
  }

  return normalizeRejectedDeliveryAck({
    message: input.message,
    reason: "tmux_send_failed",
    ...(input.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
      : {})
  });
}

function toNormalizedAcceptedAck(
  result: Pick<
    DeliveryAckLike,
    "message" | "sessionName" | "targetPaneIndex" | "deliveryTargetReasonCode"
  >
): DeliveryAck {
  return normalizeAcceptedDeliveryAck({
    message: result.message,
    ...(result.sessionName !== undefined
      ? { sessionName: result.sessionName }
      : {}),
    ...(result.targetPaneIndex !== undefined
      ? { targetPaneIndex: result.targetPaneIndex }
      : {}),
    ...(result.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: result.deliveryTargetReasonCode }
      : {})
  });
}

function toNormalizedRejectedAck(
  result: Pick<
    DeliveryAckLike,
    "message" | "reason" | "reason_code" | "sessionName" | "targetPaneIndex" | "deliveryTargetReasonCode"
  >
): Extract<DeliveryAck, { status: "rejected" }> {
  return normalizeRejectedDeliveryAck({
    message: result.message,
    ...(result.reason !== undefined
      ? { reason: result.reason }
      : {}),
    ...(result.reason_code !== undefined
      ? { reason_code: result.reason_code }
      : {}),
    ...(result.sessionName !== undefined
      ? { sessionName: result.sessionName }
      : {}),
    ...(result.targetPaneIndex !== undefined
      ? { targetPaneIndex: result.targetPaneIndex }
      : {}),
    ...(result.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: result.deliveryTargetReasonCode }
      : {})
  });
}

export function normalizeDeliveryAck(result: DeliveryAckLike): DeliveryAck {
  if ("status" in result && result.status !== undefined) {
    return result.status === "accepted"
      ? toNormalizedAcceptedAck(result)
      : toNormalizedRejectedAck(result);
  }

  if (result.delivered) {
    return toNormalizedAcceptedAck(result);
  }

  return toNormalizedRejectedAck(result);
}
