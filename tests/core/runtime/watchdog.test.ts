import { describe, expect, it } from "vitest";

import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { computeWatchdogStatus } from "../../../src/v11/shared/watchdog/watchdogStatus.js";
import type { BubbleStateSnapshot } from "../../../src/types/bubble.js";

function createState(partial: Partial<BubbleStateSnapshot>): BubbleStateSnapshot {
  return {
    bubble_id: "b_watchdog_01",
    state: "RUNNING",
    round: 1,
    active_agent: "codex",
    active_since: "2026-02-22T12:00:00.000Z",
    active_role: "implementer",
    round_role_history: [
      {
        round: 1,
        implementer: "codex",
        reviewer: "claude",
        switched_at: "2026-02-22T12:00:00.000Z"
      }
    ],
    last_command_at: "2026-02-22T12:05:00.000Z",
    meta_review: {
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    },
    ...partial
  };
}

describe("computeWatchdogStatus", () => {
  it("computes countdown from last_command_at", () => {
    const status = computeWatchdogStatus(
      createState({}),
      5,
      new Date("2026-02-22T12:08:00.000Z")
    );

    expect(status.monitored).toBe(true);
    expect(status.remainingSeconds).toBe(120);
    expect(status.expired).toBe(false);
  });

  it("marks watchdog expired at deadline", () => {
    const status = computeWatchdogStatus(
      createState({}),
      5,
      new Date("2026-02-22T12:10:00.000Z")
    );

    expect(status.remainingSeconds).toBe(0);
    expect(status.expired).toBe(true);
  });

  it("falls back to active_since when last_command_at missing", () => {
    const status = computeWatchdogStatus(
      createState({ last_command_at: null }),
      5,
      new Date("2026-02-22T12:04:00.000Z")
    );

    expect(status.referenceTimestamp).toBe("2026-02-22T12:00:00.000Z");
    expect(status.remainingSeconds).toBe(60);
  });

  it("disables monitoring when active agent is absent", () => {
    const status = computeWatchdogStatus(
      createState({
        active_agent: null,
        active_role: null,
        active_since: null
      }),
      5
    );

    expect(status.monitored).toBe(false);
    expect(status.remainingSeconds).toBeNull();
  });

  it("treats RUNNING meta-review authority as watchdog-monitored from execution_context authority (including recovery with null active_agent) while keeping human-only states unmonitored", () => {
    const metaRunning = computeWatchdogStatus(
      createState({
        state: "RUNNING",
        active_since: "2026-02-22T12:07:00.000Z",
        last_command_at: "2026-02-22T12:08:00.000Z",
        meta_review: {
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: "b_watchdog_01",
            round: 1,
            startedAt: "2026-02-22T12:00:00.000Z",
            watchdogTimeoutMinutes: 5,
            attempt: 1
          }),
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }),
      5,
      new Date("2026-02-22T12:04:00.000Z")
    );
    const metaRunningRecovery = computeWatchdogStatus(
      createState({
        state: "RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        meta_review: {
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: "b_watchdog_01",
            round: 1,
            startedAt: "2026-02-22T12:00:00.000Z",
            watchdogTimeoutMinutes: 5,
            attempt: 1
          }),
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }),
      5,
      new Date("2026-02-22T12:08:00.000Z")
    );
    const humanGate = computeWatchdogStatus(
      createState({ state: "READY_FOR_HUMAN_APPROVAL" }),
      5,
      new Date("2026-02-22T12:08:00.000Z")
    );

    expect(metaRunning.monitored).toBe(true);
    expect(metaRunningRecovery.monitored).toBe(true);
    expect(humanGate.monitored).toBe(false);
    expect(metaRunning.monitoredAgent).toBe("codex");
    expect(metaRunningRecovery.monitoredAgent).toBeNull();
    expect(humanGate.monitoredAgent).toBe("codex");
    expect(metaRunning.referenceTimestamp).toBe("2026-02-22T12:00:00.000Z");
    expect(metaRunning.deadlineTimestamp).toBe("2026-02-22T12:05:00.000Z");
    expect(metaRunning.remainingSeconds).toBe(60);
    expect(metaRunning.expired).toBe(false);
    expect(metaRunningRecovery.referenceTimestamp).toBe("2026-02-22T12:00:00.000Z");
    expect(metaRunningRecovery.deadlineTimestamp).toBe("2026-02-22T12:05:00.000Z");
    expect(metaRunningRecovery.remainingSeconds).toBe(0);
    expect(metaRunningRecovery.expired).toBe(true);
  });

  it("does not require active meta-review execution context after watchdog escalation to WAITING_HUMAN", () => {
    const status = computeWatchdogStatus(
      createState({
        state: "WAITING_HUMAN",
        active_role: "meta_reviewer",
        active_since: "2026-02-22T12:00:00.000Z",
        last_command_at: "2026-02-22T12:05:00.000Z",
        execution_context: null,
        meta_review: {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 1,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }),
      5,
      new Date("2026-02-22T12:08:00.000Z")
    );

    expect(status.monitored).toBe(true);
    expect(status.monitoredAgent).toBe("codex");
    expect(status.referenceTimestamp).toBe("2026-02-22T12:05:00.000Z");
    expect(status.deadlineTimestamp).toBe("2026-02-22T12:10:00.000Z");
    expect(status.remainingSeconds).toBe(120);
    expect(status.expired).toBe(false);
  });

  it("disables watchdog monitoring for RUNNING ideation round (round=0)", () => {
    const status = computeWatchdogStatus(
      createState({
        round: 0,
        last_command_at: "2026-02-22T12:00:00.000Z"
      }),
      5,
      new Date("2026-02-22T12:10:00.000Z")
    );

    expect(status.monitored).toBe(false);
    expect(status.remainingSeconds).toBeNull();
    expect(status.expired).toBe(false);
  });

  it("ignores failed runtime delivery before the canonical meta-review deadline", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_watchdog_01",
      round: 1,
      startedAt: "2026-02-22T12:00:00.000Z",
      watchdogTimeoutMinutes: 5,
      attempt: 1
    });

    const status = computeWatchdogStatus(
      createState({
        state: "RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-02-22T12:04:30.000Z",
        meta_review: {
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEWER_PANE_EXITED",
            message: "meta-reviewer pane exited after durable kickoff",
            observed_at: "2026-02-22T12:04:30.000Z",
            observed_for_handoff_id: executionContext.handoff_id,
            observed_for_round: executionContext.round
          },
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }),
      5,
      new Date("2026-02-22T12:04:45.000Z")
    );

    expect(status.monitored).toBe(true);
    expect(status.referenceTimestamp).toBe("2026-02-22T12:00:00.000Z");
    expect(status.deadlineTimestamp).toBe("2026-02-22T12:05:00.000Z");
    expect(status.remainingSeconds).toBe(15);
    expect(status.expired).toBe(false);
  });

  it("keeps the original execution-context deadline after restart/rebind activity", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_watchdog_01",
      round: 1,
      startedAt: "2026-02-22T12:00:00.000Z",
      watchdogTimeoutMinutes: 5,
      attempt: 1
    });

    const status = computeWatchdogStatus(
      createState({
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-02-22T12:04:30.000Z",
        last_command_at: "2026-02-22T12:04:45.000Z",
        meta_review: {
          execution_context: executionContext,
          runtime_delivery: {
            status: "uncertain",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
            message: "meta-reviewer pane did not confirm structured submit request delivery",
            observed_at: "2026-02-22T12:04:45.000Z",
            observed_for_handoff_id: executionContext.handoff_id,
            observed_for_round: executionContext.round
          },
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }),
      5,
      new Date("2026-02-22T12:05:30.000Z")
    );

    expect(status.monitored).toBe(true);
    expect(status.referenceTimestamp).toBe("2026-02-22T12:00:00.000Z");
    expect(status.deadlineTimestamp).toBe("2026-02-22T12:05:00.000Z");
    expect(status.remainingSeconds).toBe(0);
    expect(status.expired).toBe(true);
  });
});
