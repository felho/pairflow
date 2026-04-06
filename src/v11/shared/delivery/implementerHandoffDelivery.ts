import type {
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export interface ExecuteImplementerHandoffDeliveryResult {
  result: EmitTmuxDeliveryNotificationResult;
  retried: boolean;
}

export function shouldRetryImplementerHandoffDelivery(
  result: EmitTmuxDeliveryNotificationResult | undefined
): boolean {
  return (
    result !== undefined &&
    !result.delivered &&
    (
      result.reason === "delivery_unconfirmed" ||
      result.reason === "tmux_send_failed"
    )
  );
}

function buildUnexpectedDeliveryFailureResult(): EmitTmuxDeliveryNotificationResult {
  return {
    delivered: false,
    message: "",
    reason: "tmux_send_failed"
  };
}

export async function executeImplementerHandoffDelivery(input: {
  deliveryInput: EmitTmuxDeliveryNotificationInput;
  emitDelivery: (
    deliveryInput: EmitTmuxDeliveryNotificationInput
  ) => Promise<EmitTmuxDeliveryNotificationResult>;
}): Promise<ExecuteImplementerHandoffDeliveryResult> {
  let deliveryResult = await input.emitDelivery(input.deliveryInput).catch(
    () => buildUnexpectedDeliveryFailureResult()
  );
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
