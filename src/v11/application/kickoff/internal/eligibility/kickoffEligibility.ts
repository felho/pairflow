import {
  IDEATION_ALREADY_ACTIVE,
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_NOT_ELIGIBLE,
  IDEATION_KICKOFF_REQUIRES_RUNNING
} from "../../../../shared/ideation/ideationReasonCodes.js";
import type { BubbleLifecycleState } from "../../../../../contracts/kernel/lifecycle.js";

export interface KickoffEligibilityStateSnapshot {
  state: BubbleLifecycleState;
  round: number;
}

export interface ResolveKickoffEligibilityInput {
  hasParseWarning: boolean;
  ideationMode: boolean;
  ideationTaskPending: boolean;
  state: KickoffEligibilityStateSnapshot;
}

function hasKickoffConfigurationGuardFailure(
  input: ResolveKickoffEligibilityInput
): boolean {
  return input.hasParseWarning || !input.ideationMode;
}

function hasKickoffStateGuardFailure(
  input: ResolveKickoffEligibilityInput
): string | null {
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

export function resolveKickoffEligibilityFailureReason(
  input: ResolveKickoffEligibilityInput
): string | null {
  if (hasKickoffConfigurationGuardFailure(input)) {
    return IDEATION_KICKOFF_NOT_ALLOWED;
  }
  return hasKickoffStateGuardFailure(input);
}
