import type {
  EmitTmuxDeliveryNotificationResult,
  TmuxDeliveryAckReasonCode,
  TmuxDeliveryAckStatus
} from "../../shared/ports/tmuxDelivery.js";

export interface PassResultDelivery {
  status: TmuxDeliveryAckStatus;
  delivered: boolean;
  reason?: Exclude<EmitTmuxDeliveryNotificationResult["reason"], undefined>;
  reason_code?: TmuxDeliveryAckReasonCode;
  retried: boolean;
}

export function mapPassResultDelivery(input: {
  deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
  deliveryRetried: boolean;
}): PassResultDelivery | undefined {
  if (input.deliveryResult === undefined) {
    return undefined;
  }

  const status: TmuxDeliveryAckStatus =
    input.deliveryResult.delivered ? "accepted" : "rejected";
  return {
    status,
    delivered: input.deliveryResult.delivered,
    ...(input.deliveryResult.reason !== undefined
      ? { reason: input.deliveryResult.reason }
      : {}),
    ...(input.deliveryResult.reason_code !== undefined
      ? { reason_code: input.deliveryResult.reason_code }
      : {}),
    retried: input.deliveryRetried
  };
}
