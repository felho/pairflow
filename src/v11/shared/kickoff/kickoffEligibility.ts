import {
  IDEATION_ALREADY_ACTIVE,
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_NOT_ELIGIBLE,
  IDEATION_KICKOFF_REQUIRES_RUNNING
} from "../../../core/bubble/ideation.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";

export interface ResolveKickoffEligibilityInput {
  hasParseWarning: boolean;
  ideationMode: boolean;
  ideationTaskPending: boolean;
  state: BubbleStateSnapshot;
}

export function resolveKickoffEligibilityFailureReason(
  input: ResolveKickoffEligibilityInput
): string | null {
  if (input.hasParseWarning) {
    return IDEATION_KICKOFF_NOT_ALLOWED;
  }
  if (!input.ideationMode) {
    return IDEATION_KICKOFF_NOT_ALLOWED;
  }
  if (input.state.round >= 1) {
    return IDEATION_ALREADY_ACTIVE;
  }
  if (input.state.state !== "RUNNING") {
    return IDEATION_KICKOFF_REQUIRES_RUNNING;
  }
  if (!input.ideationTaskPending) {
    return IDEATION_KICKOFF_NOT_ELIGIBLE;
  }
  return null;
}
