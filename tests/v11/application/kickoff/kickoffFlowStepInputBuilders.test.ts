import { describe, expect, it } from "vitest";

import {
  buildKickoffExecutionStepInput,
  buildKickoffValidationStepInput
} from "../../../../src/v11/application/kickoff/kickoffFlowStepInputBuilders.js";
import type { KickoffPreparedValidation } from "../../../../src/v11/application/kickoff/kickoffValidationPreparation.js";

describe("kickoffFlowStepInputBuilders", () => {
  it("builds validation-step input from kickoff flow input", () => {
    const input = buildKickoffValidationStepInput({
      bubbleId: "b_kickoff_flow_input_01",
      repoPath: "/repo",
      task: "Implement kickoff flow builders",
      taskFile: "/tmp/task.md",
      cwd: "/repo/work"
    });

    expect(input).toEqual({
      bubbleId: "b_kickoff_flow_input_01",
      repoPath: "/repo",
      task: "Implement kickoff flow builders",
      taskFile: "/tmp/task.md",
      cwd: "/repo/work"
    });
  });

  it("builds execution-step input from validated kickoff payload", () => {
    const validation = {
      kind: "prepared",
      resolved: {
        bubbleId: "b_kickoff_flow_input_02",
        bubbleConfig: {} as never,
        bubblePaths: {} as never,
        repoPath: "/repo"
      },
      loadedState: {
        state: {
          bubble_id: "b_kickoff_flow_input_02",
          state: "RUNNING",
          round: 0,
          active_agent: "claude",
          active_since: "2026-03-19T23:40:00.000Z",
          active_role: "reviewer",
          round_role_history: [],
          last_command_at: "2026-03-19T23:40:00.000Z"
        },
        fingerprint: "fp"
      },
      state: {
        bubble_id: "b_kickoff_flow_input_02",
        state: "RUNNING",
        round: 0,
        active_agent: "claude",
        active_since: "2026-03-19T23:40:00.000Z",
        active_role: "reviewer",
        round_role_history: [],
        last_command_at: "2026-03-19T23:40:00.000Z"
      },
      markersBefore: {
        ideation_mode: true,
        ideation_task_pending: true
      },
      task: {
        content: "Execute kickoff flow",
        source: "inline"
      }
    } as unknown as KickoffPreparedValidation;
    const now = new Date("2026-03-19T23:41:00.000Z");

    const input = buildKickoffExecutionStepInput({
      validation,
      now,
      nowIso: now.toISOString()
    });

    expect(input).toEqual({
      validation,
      now,
      nowIso: "2026-03-19T23:41:00.000Z"
    });
  });
});
