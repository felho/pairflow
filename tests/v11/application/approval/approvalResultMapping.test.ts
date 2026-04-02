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
      watchdogTimeoutMinutes: 60,
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

  it("clears live meta-review authority when human rework starts the next round", () => {
    const transitions: unknown[] = [];
    const next = resolveApprovalNextState({
      state: {
        bubble_id: "b_approval_03",
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 2,
        meta_review: {
          last_autonomous_run_id: "run_prev_round",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Previous round approve",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-19T21:59:00.000Z",
          auto_rework_count: 1,
          auto_rework_limit: 5,
          sticky_human_gate: true
        }
      } as never,
      decision: "rework",
      nowIso: "2026-03-19T22:00:00.000Z",
      implementer: "codex",
      reviewer: "claude",
      watchdogTimeoutMinutes: 60,
      applyStateTransition: ((state: Record<string, unknown>, transition: unknown) => {
        transitions.push(transition);
        return {
          ...state,
          state: "RUNNING",
          round: 3
        };
      }) as never
    });

    expect(next.meta_review).toMatchObject({
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 1,
      auto_rework_limit: 5,
      sticky_human_gate: false
    });
    expect(transitions).toEqual([
      {
        to: "RUNNING",
        round: 3,
        activeAgent: "codex",
        activeRole: "implementer",
        executionContext: {
          active_role: "implementer",
          awaited_output_type: "pass_result",
          handoff_id: "implementer:b_approval_03:round:3:attempt:1",
          round: 3,
          started_at: "2026-03-19T22:00:00.000Z",
          deadline_at: "2026-03-19T23:00:00.000Z",
          attempt: 1
        },
        activeSince: "2026-03-19T22:00:00.000Z",
        lastCommandAt: "2026-03-19T22:00:00.000Z",
        appendRoundRoleEntry: {
          round: 3,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-03-19T22:00:00.000Z"
        }
      }
    ]);
  });
});
