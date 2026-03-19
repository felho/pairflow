import { describe, expect, it } from "vitest";

import {
  mapImmediateReworkResult,
  mapQueuedReworkResult,
  resolveApprovalNextState
} from "../../../../src/v11/application/approval/approvalResultMapping.js";

describe("approvalResultMapping", () => {
  it("maps approve decision to APPROVED_FOR_COMMIT transition payload", () => {
    const transitions: unknown[] = [];
    const next = resolveApprovalNextState({
      state: {
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 2
      } as never,
      decision: "approve",
      nowIso: "2026-03-19T22:00:00.000Z",
      implementer: "codex",
      reviewer: "claude",
      applyStateTransition: ((state: unknown, transition: unknown) => {
        transitions.push(transition);
        return {
          ...(state as Record<string, unknown>),
          state: "APPROVED_FOR_COMMIT",
          last_command_at: "2026-03-19T22:00:00.000Z"
        };
      }) as never
    });

    expect(transitions).toEqual([
      {
        to: "APPROVED_FOR_COMMIT",
        lastCommandAt: "2026-03-19T22:00:00.000Z"
      }
    ]);
    expect((next as { state: string }).state).toBe("APPROVED_FOR_COMMIT");
  });

  it("maps immediate and queued rework result envelopes", () => {
    const immediate = mapImmediateReworkResult({
      bubbleId: "b_approval_01",
      sequence: 12,
      envelope: { id: "msg_12" },
      state: { state: "RUNNING" }
    } as never);
    expect(immediate.mode).toBe("immediate");

    const queued = mapQueuedReworkResult({
      bubbleId: "b_approval_02",
      state: {
        state: "WAITING_HUMAN"
      } as never,
      intent: {
        intent_id: "intent_01"
      } as never,
      supersededIntentId: "intent_00"
    });
    expect(queued).toMatchObject({
      mode: "queued",
      bubbleId: "b_approval_02",
      intentId: "intent_01",
      supersededIntentId: "intent_00"
    });
  });
});
