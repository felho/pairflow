import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import { prepareKickoffEligibility } from "./kickoffEligibilityPreparation.js";
import { buildKickoffEligibilityFailureResult } from "./kickoffValidationFailureBuilders.js";
import type {
  KickoffBubbleResultShape,
  KickoffIdeationMarkers
} from "./kickoffResultBuilders.js";
import {
  loadKickoffEligibilityState,
  type KickoffEligibilityLoadedState,
  type KickoffEligibilityResolvedBubble,
  type KickoffValidationBubbleInput
} from "./kickoffEligibilityStateLoading.js";
export type {
  KickoffEligibilityLoadedState,
  KickoffEligibilityResolvedBubble,
  KickoffValidationBubbleInput
} from "./kickoffEligibilityStateLoading.js";

type PrepareKickoffEligibilityOrFailureResult =
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

function prepareKickoffEligibilityOrFailure(input: {
  resolvedBubbleId: string;
  state: KickoffEligibilityLoadedState["state"];
  bubbleConfig: KickoffEligibilityResolvedBubble["bubbleConfig"];
}): PrepareKickoffEligibilityOrFailureResult {
  const preparedEligibility = prepareKickoffEligibility({
    bubbleConfig: input.bubbleConfig,
    state: input.state
  });
  const { markersBefore, eligibilityFailureReason } = preparedEligibility;
  if (eligibilityFailureReason !== null) {
    return {
      kind: "failure",
      result: buildKickoffEligibilityFailureResult({
        resolvedBubbleId: input.resolvedBubbleId,
        eligibilityFailureReason,
        state: input.state,
        markersBefore
      })
    };
  }

  return {
    kind: "eligible",
    markersBefore
  };
}

export type PrepareKickoffBubbleEligibilityOrFailureResult =
  | {
      kind: "failure";
      result: {
        kind: "failure";
        result: KickoffBubbleResultShape;
      };
    }
  | {
      kind: "eligible";
      resolved: KickoffEligibilityResolvedBubble;
      loadedState: KickoffEligibilityLoadedState;
      state: KickoffEligibilityLoadedState["state"];
      markersBefore: KickoffIdeationMarkers;
    };

export async function prepareKickoffBubbleEligibilityOrFailure(input: {
  validationInput: KickoffValidationBubbleInput;
  dependencies: Pick<ResolvedKickoffDependencies, "resolveBubble" | "readState">;
}): Promise<PrepareKickoffBubbleEligibilityOrFailureResult> {
  const { resolved, loadedState, state } = await loadKickoffEligibilityState({
    validationInput: input.validationInput,
    dependencies: input.dependencies
  });
  const eligibility = prepareKickoffEligibilityOrFailure({
    resolvedBubbleId: resolved.bubbleId,
    state,
    bubbleConfig: resolved.bubbleConfig
  });
  if (eligibility.kind === "failure") {
    return eligibility;
  }

  return {
    kind: "eligible",
    resolved,
    loadedState,
    state,
    markersBefore: eligibility.markersBefore
  };
}
