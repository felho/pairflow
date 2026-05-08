import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import { prepareKickoffEligibility } from "./kickoffEligibilityPreparation.js";
import {
  buildKickoffEligibilityOutcome,
  type PrepareKickoffEligibilityOrFailureResult
} from "./kickoffEligibilityOutcomeBuilder.js";

export function prepareKickoffEligibilityOrFailure(input: {
  resolvedBubbleId: string;
  state: BubbleStateSnapshot;
  bubbleConfig: BubbleConfig;
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
