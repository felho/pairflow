import type { EmitTmuxDeliveryNotificationResult } from "../../../core/runtime/tmuxDelivery.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type { KickoffResultDelivery } from "./kickoffResultBuilders.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";

function mapKickoffResultDelivery(input: {
  deliveryResult: EmitTmuxDeliveryNotificationResult;
  deliveryRetried: boolean;
}): KickoffResultDelivery {
  return {
    delivered: input.deliveryResult.delivered,
    ...(input.deliveryResult.reason !== undefined
      ? { reason: input.deliveryResult.reason }
      : {}),
    retried: input.deliveryRetried
  };
}

export function buildKickoffMissingEnvelopeDeliveryResult(): KickoffResultDelivery {
  return {
    delivered: false,
    reason: "delivery_unconfirmed",
    retried: false
  };
}

export async function executeKickoffValidatedDelivery(input: {
  validation: KickoffPreparedValidation;
  envelope: ProtocolEnvelope;
  dependencies: ResolvedKickoffDependencies;
}): Promise<KickoffResultDelivery> {
  const emitFallbackResult: EmitTmuxDeliveryNotificationResult = {
    delivered: false,
    message: "",
    reason: "tmux_send_failed"
  };
  const deliveryResult = await input.dependencies.emitDelivery({
    bubbleId: input.validation.resolved.bubbleId,
    bubbleConfig: input.validation.resolved.bubbleConfig,
    sessionsPath: input.validation.resolved.bubblePaths.sessionsPath,
    envelope: input.envelope
  }).catch(() => emitFallbackResult);

  return mapKickoffResultDelivery({
    deliveryResult,
    deliveryRetried: false
  });
}
