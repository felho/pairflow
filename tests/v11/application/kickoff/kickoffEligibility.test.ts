import { describe, expect, it } from "vitest";

import {
  IDEATION_ALREADY_ACTIVE,
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_NOT_ELIGIBLE,
  IDEATION_KICKOFF_REQUIRES_RUNNING
} from "../../../../src/v11/shared/ideation/ideationReasonCodes.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/domain/state/bubbleStateSnapshotTypes.js";
import { resolveKickoffEligibilityFailureReason } from "../../../../src/v11/application/kickoff/internal/eligibility/kickoffEligibility.js";

const baseState = {
  bubble_id: "b_test",
  state: "RUNNING" as const,
  round: 0,
  active_agent: "codex",
  active_role: "implementer" as const,
  active_since: "2026-03-19T12:00:00.000Z",
  last_command_at: "2026-03-19T12:00:00.000Z",
  round_role_history: []
} as unknown as BubbleStateSnapshot;

describe("resolveKickoffEligibilityFailureReason", () => {
  it("returns null when kickoff is eligible", () => {
    expect(
      resolveKickoffEligibilityFailureReason({
        hasParseWarning: false,
        ideationMode: true,
        ideationTaskPending: true,
        state: baseState
      })
    ).toBeNull();
  });

  it("applies guard precedence deterministically", () => {
    expect(
      resolveKickoffEligibilityFailureReason({
        hasParseWarning: true,
        ideationMode: true,
        ideationTaskPending: true,
        state: {
          ...baseState,
          round: 2
        }
      })
    ).toBe(IDEATION_KICKOFF_NOT_ALLOWED);

    expect(
      resolveKickoffEligibilityFailureReason({
        hasParseWarning: false,
        ideationMode: false,
        ideationTaskPending: true,
        state: baseState
      })
    ).toBe(IDEATION_KICKOFF_NOT_ALLOWED);

    expect(
      resolveKickoffEligibilityFailureReason({
        hasParseWarning: false,
        ideationMode: true,
        ideationTaskPending: true,
        state: {
          ...baseState,
          round: 1
        }
      })
    ).toBe(IDEATION_ALREADY_ACTIVE);

    expect(
      resolveKickoffEligibilityFailureReason({
        hasParseWarning: false,
        ideationMode: true,
        ideationTaskPending: true,
        state: {
          ...baseState,
          state: "CREATED"
        }
      })
    ).toBe(IDEATION_KICKOFF_REQUIRES_RUNNING);

    expect(
      resolveKickoffEligibilityFailureReason({
        hasParseWarning: false,
        ideationMode: true,
        ideationTaskPending: false,
        state: baseState
      })
    ).toBe(IDEATION_KICKOFF_NOT_ELIGIBLE);
  });
});
