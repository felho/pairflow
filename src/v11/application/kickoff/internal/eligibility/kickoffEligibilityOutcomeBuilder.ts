import { buildKickoffEligibilityFailureResult } from "../validation/kickoffValidationFailureBuilders.js";
import type {
  KickoffBubbleResultShape,
  KickoffIdeationMarkers
} from "../validation/kickoffResultBuilders.js";
import type { KickoffEligibilityLoadedState } from "./kickoffEligibilityStateLoading.js";

export type PrepareKickoffEligibilityOrFailureResult =
  | {
      kind: "failure";
      result: {
        kind: "failure";
        result: KickoffBubbleResultShape;
      };
    }
  | {
      kind: "eligible";
      markersBefore: KickoffIdeationMarkers;
    };

export function buildKickoffEligibilityOutcome(input: {
  resolvedBubbleId: string;
  state: KickoffEligibilityLoadedState["state"];
  markersBefore: KickoffIdeationMarkers;
  eligibilityFailureReason: string | null;
}): PrepareKickoffEligibilityOrFailureResult {
  if (input.eligibilityFailureReason !== null) {
    return {
      kind: "failure",
      result: buildKickoffEligibilityFailureResult({
        resolvedBubbleId: input.resolvedBubbleId,
        eligibilityFailureReason: input.eligibilityFailureReason,
        state: input.state,
        markersBefore: input.markersBefore
      })
    };
  }

  return {
    kind: "eligible",
    markersBefore: input.markersBefore
  };
}
