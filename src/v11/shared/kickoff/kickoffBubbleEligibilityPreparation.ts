import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import { prepareKickoffEligibility } from "./kickoffEligibilityPreparation.js";
import { buildKickoffResolveBubbleInput } from "./kickoffValidationInputBuilders.js";
import { buildKickoffEligibilityFailureResult } from "./kickoffValidationFailureBuilders.js";
import type {
  KickoffBubbleResultShape,
  KickoffIdeationMarkers
} from "./kickoffResultBuilders.js";

export interface KickoffValidationBubbleInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}

export type KickoffEligibilityResolvedBubble = Awaited<
  ReturnType<ResolvedKickoffDependencies["resolveBubble"]>
>;

export type KickoffEligibilityLoadedState = Awaited<
  ReturnType<ResolvedKickoffDependencies["readState"]>
>;

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
  const resolved = await input.dependencies.resolveBubble(
    buildKickoffResolveBubbleInput(input.validationInput)
  );
  const loadedState = await input.dependencies.readState(
    resolved.bubblePaths.statePath
  );
  const state = loadedState.state;
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
