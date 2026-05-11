import { describe, expect, it, vi } from "vitest";

import {
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_TASK_INVALID
} from "../../../../src/v11/shared/ideation/ideationReasonCodes.js";
import type { BubbleConfig } from "../../../../src/v11/shared/config/bubbleConfigTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ResolvedKickoffDependencies } from "../../../../src/v11/application/kickoff/internal/validation/kickoffDependencyContract.js";
import { prepareKickoffValidation } from "../../../../src/v11/application/kickoff/internal/validation/kickoffValidationPreparation.js";

function createStateSnapshot(): PersistedBubbleStateSnapshot {
  return {
    bubble_id: "b_kickoff_validation_01",
    state: "RUNNING",
    round: 0,
    active_agent: "claude",
    active_since: "2026-03-19T22:00:00.000Z",
    active_role: "reviewer",
    round_role_history: [],
    last_command_at: "2026-03-19T22:00:00.000Z"
  };
}

function createDependencies(config: BubbleConfig, state: PersistedBubbleStateSnapshot): ResolvedKickoffDependencies {
  const resolvedBubble = {
    bubbleId: "b_kickoff_validation_01",
    bubbleConfig: config,
    bubblePaths: {
      statePath: "/tmp/state.json"
    }
  } as unknown as Awaited<ReturnType<ResolvedKickoffDependencies["resolveBubble"]>>;

  return {
    resolveBubble: vi.fn(async () => resolvedBubble),
    readState: vi.fn(async () => ({
      state,
      fingerprint: "fingerprint-01"
    })),
    writeState: vi.fn(async () => ({
      state,
      fingerprint: "fingerprint-02"
    })) as unknown as ResolvedKickoffDependencies["writeState"],
    readFileFn: ((...args: unknown[]) => {
      void args;
      return Promise.resolve("");
    }) as unknown as ResolvedKickoffDependencies["readFileFn"],
    statFileFn: ((...args: unknown[]) => {
      void args;
      return Promise.resolve({
        isFile: () => true
      });
    }) as unknown as ResolvedKickoffDependencies["statFileFn"],
    writeFileFn: ((...args: unknown[]) => {
      void args;
      return Promise.resolve(undefined);
    }) as unknown as ResolvedKickoffDependencies["writeFileFn"],
    appendEnvelope: vi.fn(async () => ({})) as unknown as ResolvedKickoffDependencies["appendEnvelope"],
    emitDelivery: vi.fn(async () => ({
      status: "accepted" as const,
      message: "ok"
    })) as unknown as ResolvedKickoffDependencies["emitDelivery"]
  };
}

describe("prepareKickoffValidation", () => {
  it("returns prepared kickoff validation payload when inputs are eligible", async () => {
    const state = createStateSnapshot();
    const dependencies = createDependencies({
      id: "b_kickoff_validation_01",
      ideation: {
        mode: true,
        task_pending: true
      }
    } as unknown as BubbleConfig, state);

    const result = await prepareKickoffValidation({
      bubbleId: "b_kickoff_validation_01",
      task: "  Implement kickoff validation seam  "
    }, dependencies);

    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.markersBefore).toEqual({
        ideation_mode: true,
        ideation_task_pending: true
      });
      expect(result.task).toEqual({
        content: "Implement kickoff validation seam",
        source: "inline"
      });
      expect(result.loadedState.fingerprint).toBe("fingerprint-01");
    }
  });

  it("returns failure result when kickoff eligibility is not satisfied", async () => {
    const state = createStateSnapshot();
    const dependencies = createDependencies({
      id: "b_kickoff_validation_02",
      ideation: {
        mode: false,
        task_pending: true
      }
    } as unknown as BubbleConfig, state);

    const result = await prepareKickoffValidation({
      bubbleId: "b_kickoff_validation_02",
      task: "Kickoff task"
    }, dependencies);

    expect(result).toMatchObject({
      kind: "failure",
      result: {
        ok: false,
        reason_code: IDEATION_KICKOFF_NOT_ALLOWED
      }
    });
  });

  it("returns invalid-task failure when kickoff task input is missing", async () => {
    const state = createStateSnapshot();
    const dependencies = createDependencies({
      id: "b_kickoff_validation_03",
      ideation: {
        mode: true,
        task_pending: true
      }
    } as unknown as BubbleConfig, state);

    const result = await prepareKickoffValidation({
      bubbleId: "b_kickoff_validation_03"
    }, dependencies);

    expect(result).toMatchObject({
      kind: "failure",
      result: {
        ok: false,
        reason_code: IDEATION_KICKOFF_TASK_INVALID
      }
    });
  });
});
