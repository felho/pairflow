import { IDEATION_KICKOFF_TASK_INVALID } from "../../../../shared/ideation/ideationReasonCodes.js";
import {
  buildKickoffFailureResult,
  type KickoffBubbleResultShape,
  type KickoffIdeationMarkers,
  type KickoffResultStateSnapshot
} from "./kickoffResultBuilders.js";

interface BuildKickoffValidationFailureResultInput {
  resolvedBubbleId: string;
  reasonCode: string;
  stateBefore: KickoffResultStateSnapshot;
  markersBefore: KickoffIdeationMarkers;
}

export function buildKickoffValidationFailureResult(input: BuildKickoffValidationFailureResultInput): {
  kind: "failure";
  result: KickoffBubbleResultShape;
} {
  return {
    kind: "failure",
    result: buildKickoffFailureResult({
      bubbleId: input.resolvedBubbleId,
      reasonCode: input.reasonCode,
      stateBefore: input.stateBefore,
      markersBefore: input.markersBefore
    })
  };
}

export function buildKickoffTaskInvalidFailureResult(input: {
  resolvedBubbleId: string;
  state: KickoffResultStateSnapshot;
  markersBefore: KickoffIdeationMarkers;
}): { kind: "failure"; result: KickoffBubbleResultShape } {
  return buildKickoffValidationFailureResult({
    resolvedBubbleId: input.resolvedBubbleId,
    reasonCode: IDEATION_KICKOFF_TASK_INVALID,
    stateBefore: input.state,
    markersBefore: input.markersBefore
  });
}

export function buildKickoffEligibilityFailureResult(input: {
  resolvedBubbleId: string;
  eligibilityFailureReason: string;
  state: KickoffResultStateSnapshot;
  markersBefore: KickoffIdeationMarkers;
}): { kind: "failure"; result: KickoffBubbleResultShape } {
  return buildKickoffValidationFailureResult({
    resolvedBubbleId: input.resolvedBubbleId,
    reasonCode: input.eligibilityFailureReason,
    stateBefore: input.state,
    markersBefore: input.markersBefore
  });
}
