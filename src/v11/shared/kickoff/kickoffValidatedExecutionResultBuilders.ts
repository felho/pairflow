import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import {
  buildKickoffFailureResult,
  buildKickoffSuccessResult,
  type KickoffBubbleResultShape,
  type KickoffResultDelivery
} from "./kickoffResultBuilders.js";
export type { KickoffBubbleResultShape } from "./kickoffResultBuilders.js";

export function buildKickoffPersistenceFailureResult(input: {
  validation: KickoffPreparedValidation;
  reasonCode: string;
}): KickoffBubbleResultShape {
  return buildKickoffFailureResult({
    bubbleId: input.validation.resolved.bubbleId,
    reasonCode: input.reasonCode,
    stateBefore: input.validation.state,
    markersBefore: input.validation.markersBefore
  });
}

export function buildKickoffValidatedSuccessResult(input: {
  validation: KickoffPreparedValidation;
  writtenState: {
    state: KickoffPreparedValidation["state"];
  };
  delivery?: KickoffResultDelivery;
}): KickoffBubbleResultShape {
  return buildKickoffSuccessResult({
    bubbleId: input.validation.resolved.bubbleId,
    markersBefore: input.validation.markersBefore,
    stateBefore: input.validation.state,
    stateAfter: input.writtenState.state,
    ...(input.delivery !== undefined ? { delivery: input.delivery } : {})
  });
}
