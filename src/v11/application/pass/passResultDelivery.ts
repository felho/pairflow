import type {
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus
} from "../../shared/ports/tmuxDelivery.js";

export interface PassResultDelivery {
  status: DeliveryAckStatus;
  delivered: boolean;
  reason?: Extract<DeliveryAck, { status: "rejected" }>["reason"];
  reason_code?: DeliveryAckReasonCode;
  retried: boolean;
}

export function mapPassResultDelivery(input: {
  deliveryResult: DeliveryAck | undefined;
  deliveryRetried: boolean;
}): PassResultDelivery | undefined {
  if (input.deliveryResult === undefined) {
    return undefined;
  }

  return {
    status: input.deliveryResult.status,
    delivered: input.deliveryResult.status === "accepted",
    ...(input.deliveryResult.reason !== undefined
      ? { reason: input.deliveryResult.reason }
      : {}),
    ...(input.deliveryResult.reason_code !== undefined
      ? { reason_code: input.deliveryResult.reason_code }
      : {}),
    retried: input.deliveryRetried
  };
}
