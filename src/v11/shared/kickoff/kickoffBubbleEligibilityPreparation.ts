import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
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
import {
  prepareKickoffEligibilityOrFailure
} from "./kickoffEligibilityPreparationOrFailure.js";
export type {
  KickoffEligibilityLoadedState,
  KickoffEligibilityResolvedBubble,
  KickoffValidationBubbleInput
} from "./kickoffEligibilityStateLoading.js";

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
