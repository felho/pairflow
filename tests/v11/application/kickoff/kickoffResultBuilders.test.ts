import { describe, expect, it } from "vitest";

import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";
import {
  buildKickoffFailureResult,
  buildKickoffSuccessResult
} from "../../../../src/v11/application/kickoff/kickoffResultBuilders.js";

describe("kickoffResultBuilders", () => {
  it("builds failure kickoff result shape", () => {
    const stateBefore: BubbleStateSnapshot = {
      bubble_id: "b_kickoff_result_01",
      state: "RUNNING",
      round: 0,
      active_agent: "claude",
      active_since: "2026-03-19T22:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-19T22:00:00.000Z"
    };
    const markersBefore = {
      ideation_mode: true,
      ideation_task_pending: true
    } as const;

    const result = buildKickoffFailureResult({
      bubbleId: "b_kickoff_result_01",
      reasonCode: "IDEATION_KICKOFF_STATE_CONFLICT",
      stateBefore,
      markersBefore
    });

    expect(result).toEqual({
      ok: false,
      bubble_id: "b_kickoff_result_01",
      reason_code: "IDEATION_KICKOFF_STATE_CONFLICT",
      state_changed: false,
      protocol: {
        task_envelope_appended: false
      },
      markers_before: markersBefore,
      markers_after: markersBefore,
      state_before: stateBefore
    });
  });

  it("builds success kickoff result shape", () => {
    const stateBefore: BubbleStateSnapshot = {
      bubble_id: "b_kickoff_result_02",
      state: "RUNNING",
      round: 0,
      active_agent: "claude",
      active_since: "2026-03-19T22:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-19T22:00:00.000Z"
    };
    const stateAfter: BubbleStateSnapshot = {
      bubble_id: "b_kickoff_result_02",
      state: "RUNNING",
      round: 1,
      active_agent: "codex",
      active_since: "2026-03-19T22:01:00.000Z",
      active_role: "implementer",
      round_role_history: [],
      last_command_at: "2026-03-19T22:01:00.000Z"
    };
    const markersBefore = {
      ideation_mode: true,
      ideation_task_pending: true
    } as const;

    const result = buildKickoffSuccessResult({
      bubbleId: "b_kickoff_result_02",
      markersBefore,
      stateBefore,
      stateAfter
    });

    expect(result).toEqual({
      ok: true,
      bubble_id: "b_kickoff_result_02",
      reason_code: null,
      state_changed: true,
      protocol: {
        task_envelope_appended: true
      },
      markers_before: markersBefore,
      markers_after: {
        ideation_mode: true,
        ideation_task_pending: false
      },
      state_before: stateBefore,
      state_after: stateAfter
    });
  });

  it("keeps delivered as an explicit compat projection when omitted", () => {
    const stateBefore = {
      bubble_id: "b_kickoff_result_03",
      state: "RUNNING",
      round: 0
    } as BubbleStateSnapshot;
    const stateAfter = {
      bubble_id: "b_kickoff_result_03",
      state: "RUNNING",
      round: 1
    } as BubbleStateSnapshot;

    const result = buildKickoffSuccessResult({
      bubbleId: "b_kickoff_result_03",
      markersBefore: {
        ideation_mode: true,
        ideation_task_pending: true
      },
      stateBefore,
      stateAfter,
      delivery: {
        status: "accepted",
        retried: false
      }
    });

    expect(result.delivery).toEqual({
      status: "accepted",
      retried: false
    });
  });
});
