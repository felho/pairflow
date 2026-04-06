import type { EmitTmuxDeliveryNotificationResult } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export interface PassResultDelivery {
  delivered: boolean;
  reason?: Exclude<EmitTmuxDeliveryNotificationResult["reason"], undefined>;
  retried: boolean;
}

export function mapPassResultDelivery(input: {
  deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
  deliveryRetried: boolean;
}): PassResultDelivery | undefined {
  if (input.deliveryResult === undefined) {
    return undefined;
  }

  return {
    delivered: input.deliveryResult.delivered,
    ...(input.deliveryResult.reason !== undefined
      ? { reason: input.deliveryResult.reason }
      : {}),
    retried: input.deliveryRetried
  };
}
