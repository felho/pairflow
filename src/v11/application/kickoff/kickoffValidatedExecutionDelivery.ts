import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  DeliveryAck
} from "../../shared/delivery/tmuxDeliveryContract.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type { KickoffResultDelivery } from "./kickoffResultBuilders.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";

function mapKickoffResultDelivery(input: {
  deliveryResult: DeliveryAck;
  deliveryRetried: boolean;
}): KickoffResultDelivery {
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

export function buildKickoffMissingEnvelopeDeliveryResult(): KickoffResultDelivery {
  return {
    status: "rejected",
    reason: "delivery_unconfirmed",
    reason_code: "DELIVERY_ACK_REJECTED",
    retried: false
  };
}

export async function executeKickoffValidatedDelivery(input: {
  validation: KickoffPreparedValidation;
  envelope: ProtocolEnvelope;
  dependencies: ResolvedKickoffDependencies;
}): Promise<KickoffResultDelivery> {
  const emitFallbackResult: DeliveryAck = {
    status: "rejected",
    message: "",
    reason: "command_failed",
    reason_code: "DELIVERY_ACK_REJECTED"
  };
  const deliveryResult = await input.dependencies.emitDelivery({
    bubbleId: input.validation.resolved.bubbleId,
    bubbleConfig: input.validation.resolved.bubbleConfig,
    sessionsPath: input.validation.resolved.bubblePaths.sessionsPath,
    envelope: input.envelope,
    recipientRole: "implementer"
  }).catch(() => emitFallbackResult);

  return mapKickoffResultDelivery({
    deliveryResult,
    deliveryRetried: false
  });
}
