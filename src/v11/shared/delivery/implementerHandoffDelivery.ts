import type {
  DeliveryAck,
  EmitDeliveryNotificationInput
} from "./tmuxDeliveryContract.js";
import type {
  DeliveryAckLike,
  EmitDeliveryAckLikePort
} from "../ports/tmuxDelivery.js";
import { normalizeDeliveryAck } from "./deliveryAckNormalization.js";

export interface ExecuteImplementerHandoffDeliveryResult {
  result: DeliveryAck;
  retried: boolean;
}

export function shouldRetryImplementerHandoffDelivery(
  result: DeliveryAckLike | undefined
): boolean {
  const normalized = result === undefined ? undefined : normalizeDeliveryAck(result);
  return (
    normalized !== undefined &&
    normalized.status === "rejected" &&
    (
      normalized.reason === "delivery_unconfirmed" ||
      normalized.reason === "tmux_send_failed"
    )
  );
}

function buildUnexpectedDeliveryFailureResult(): DeliveryAck {
  return {
    status: "rejected",
    message: "",
    reason: "tmux_send_failed",
    reason_code: "DELIVERY_ACK_REJECTED"
  };
}

export async function executeImplementerHandoffDelivery(input: {
  deliveryInput: EmitDeliveryNotificationInput;
  emitDelivery: EmitDeliveryAckLikePort;
}): Promise<ExecuteImplementerHandoffDeliveryResult> {
  let deliveryResult = await input.emitDelivery(input.deliveryInput)
    .then(normalizeDeliveryAck)
    .catch(() => buildUnexpectedDeliveryFailureResult());
  let deliveryRetried = false;

  if (shouldRetryImplementerHandoffDelivery(deliveryResult)) {
    deliveryRetried = true;
    const initialFailureResult = deliveryResult;
    deliveryResult = await input.emitDelivery({
      ...input.deliveryInput,
      // Newly activated implementer panes can still be warming up.
      // Retry once with the same timing used by the stable reviewer handoff flow.
      initialDelayMs: 5000,
      deliveryAttempts: 6
    }).then(normalizeDeliveryAck).catch(() => initialFailureResult);
  }

  return {
    result: deliveryResult,
    retried: deliveryRetried
  };
}
