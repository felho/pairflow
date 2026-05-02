import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import type {
  KickoffEligibilityLoadedState,
  KickoffEligibilityResolvedBubble
} from "./kickoffBubbleEligibilityPreparation.js";
import type { KickoffIdeationMarkers } from "./kickoffResultBuilders.js";

export interface BuildKickoffPreparedValidationResultInput {
  resolved: KickoffEligibilityResolvedBubble;
  loadedState: KickoffEligibilityLoadedState;
  state: KickoffEligibilityLoadedState["state"];
  markersBefore: KickoffIdeationMarkers;
  task: ResolvedKickoffTaskInput;
}

export function buildKickoffPreparedValidationResult(
  input: BuildKickoffPreparedValidationResultInput
): {
  kind: "prepared";
  resolved: KickoffEligibilityResolvedBubble;
  loadedState: KickoffEligibilityLoadedState;
  state: KickoffEligibilityLoadedState["state"];
  markersBefore: KickoffIdeationMarkers;
  task: ResolvedKickoffTaskInput;
} {
  return {
    kind: "prepared",
    resolved: input.resolved,
    loadedState: input.loadedState,
    state: input.state,
    markersBefore: input.markersBefore,
    task: input.task
  };
}
