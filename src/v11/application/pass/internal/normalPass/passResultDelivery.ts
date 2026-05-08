import type {
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus
} from "../../../../ports/tmuxDelivery.js";

export interface PassResultDelivery {
  status: DeliveryAckStatus;
  reason?: Exclude<Extract<DeliveryAck, { status: "rejected" }>["reason"], undefined>;
  reason_code?: Exclude<DeliveryAckReasonCode, undefined>;
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
    ...(input.deliveryResult.reason !== undefined
      ? { reason: input.deliveryResult.reason }
      : {}),
    ...(input.deliveryResult.reason_code !== undefined
      ? { reason_code: input.deliveryResult.reason_code }
      : {}),
    retried: input.deliveryRetried
  };
}
