import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import { resolveIdeationMetadata } from "../../../../domain/ideation/ideationMetadata.js";
import { resolveKickoffEligibilityFailureReason } from "./kickoffEligibility.js";

export interface KickoffEligibilityPreparationInput {
  bubbleConfig: BubbleConfig;
  state: BubbleStateSnapshot;
}

export interface KickoffEligibilityPreparationResult {
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  eligibilityFailureReason: string | null;
}

function buildKickoffMarkersBefore(input: {
  ideationMode: boolean;
  ideationTaskPending: boolean;
}): KickoffEligibilityPreparationResult["markersBefore"] {
  return {
    ideation_mode: input.ideationMode,
    ideation_task_pending: input.ideationTaskPending
  };
}

function buildKickoffEligibilityInput(input: {
  bubbleConfig: BubbleConfig;
  state: BubbleStateSnapshot;
  ideationMode: boolean;
  ideationTaskPending: boolean;
}): Parameters<typeof resolveKickoffEligibilityFailureReason>[0] {
  return {
    hasParseWarning: input.bubbleConfig.ideation?.parse_warning !== undefined,
    ideationMode: input.ideationMode,
    ideationTaskPending: input.ideationTaskPending,
    state: input.state
  };
}

export function prepareKickoffEligibility(
  input: KickoffEligibilityPreparationInput
): KickoffEligibilityPreparationResult {
  const ideationMetadata = resolveIdeationMetadata(input.bubbleConfig);
  const markersBefore = buildKickoffMarkersBefore({
    ideationMode: ideationMetadata.mode,
    ideationTaskPending: ideationMetadata.taskPending
  });
  const eligibilityFailureReason = resolveKickoffEligibilityFailureReason(
    buildKickoffEligibilityInput({
      bubbleConfig: input.bubbleConfig,
      state: input.state,
      ideationMode: ideationMetadata.mode,
      ideationTaskPending: ideationMetadata.taskPending
    })
  );

  return {
    markersBefore,
    eligibilityFailureReason
  };
}
