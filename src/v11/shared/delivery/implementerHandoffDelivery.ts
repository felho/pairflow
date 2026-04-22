import type {
  DeliveryAck,
  EmitDeliveryNotificationInput
} from "./tmuxDeliveryContract.js";
import type {
  EmitDeliveryNotificationAckPort
} from "../ports/tmuxDelivery.js";

export interface ExecuteImplementerHandoffDeliveryResult {
  result: DeliveryAck;
  retried: boolean;
}

export function shouldRetryImplementerHandoffDelivery(
  result: DeliveryAck | undefined
): boolean {
  return (
    result !== undefined &&
    result.status === "rejected" &&
    (
      result.reason === "delivery_unconfirmed" ||
      result.reason === "command_failed"
    )
  );
}

function buildUnexpectedDeliveryFailureResult(): DeliveryAck {
  return {
    status: "rejected",
    message: "",
    reason: "command_failed",
    reason_code: "DELIVERY_ACK_REJECTED"
  };
}

export async function executeImplementerHandoffDelivery(input: {
  deliveryInput: EmitDeliveryNotificationInput;
  emitDelivery: EmitDeliveryNotificationAckPort;
}): Promise<ExecuteImplementerHandoffDeliveryResult> {
  let deliveryResult = await input.emitDelivery(input.deliveryInput)
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
    }).catch(() => initialFailureResult);
  }

  return {
    result: deliveryResult,
    retried: deliveryRetried
  };
}
