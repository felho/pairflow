import type { ResolvedKickoffDependencies } from "../validation/kickoffDependencyContract.js";
import type {
  KickoffBubbleResultShape,
  KickoffIdeationMarkers
} from "../validation/kickoffResultBuilders.js";
import {
  loadKickoffEligibilityState,
  type KickoffEligibilityLoadedState,
  type KickoffEligibilityResolvedBubble,
  type KickoffValidationBubbleInput
} from "./kickoffEligibilityStateLoading.js";
import { prepareKickoffEligibility } from "./kickoffEligibilityPreparation.js";
import {
  buildKickoffEligibilityOutcome,
  type PrepareKickoffEligibilityOrFailureResult
} from "./kickoffEligibilityOutcomeBuilder.js";
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

function prepareKickoffEligibilityOrFailure(input: {
  resolvedBubbleId: string;
  state: KickoffEligibilityLoadedState["state"];
  bubbleConfig: KickoffEligibilityResolvedBubble["bubbleConfig"];
}): PrepareKickoffEligibilityOrFailureResult {
  const preparedEligibility = prepareKickoffEligibility({
    bubbleConfig: input.bubbleConfig,
    state: input.state
  });
  return buildKickoffEligibilityOutcome({
    resolvedBubbleId: input.resolvedBubbleId,
    state: input.state,
    markersBefore: preparedEligibility.markersBefore,
    eligibilityFailureReason: preparedEligibility.eligibilityFailureReason
  });
}

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
