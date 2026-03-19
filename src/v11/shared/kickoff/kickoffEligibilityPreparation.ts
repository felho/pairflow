import { resolveIdeationMetadata } from "../../../core/bubble/ideation.js";
import type { BubbleConfig, BubbleStateSnapshot } from "../../../types/bubble.js";
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

export function prepareKickoffEligibility(
  input: KickoffEligibilityPreparationInput
): KickoffEligibilityPreparationResult {
  const ideationMetadata = resolveIdeationMetadata(input.bubbleConfig);
  const markersBefore = {
    ideation_mode: ideationMetadata.mode,
    ideation_task_pending: ideationMetadata.taskPending
  };
  const eligibilityFailureReason = resolveKickoffEligibilityFailureReason({
    hasParseWarning: input.bubbleConfig.ideation?.parse_warning !== undefined,
    ideationMode: ideationMetadata.mode,
    ideationTaskPending: ideationMetadata.taskPending,
    state: input.state
  });

  return {
    markersBefore,
    eligibilityFailureReason
  };
}
