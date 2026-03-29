import { describe, expect, it } from "vitest";

import { buildMetaReviewExecutionContext } from "../../../src/core/bubble/metaReviewExecutionContext.js";
import { computeWatchdogStatus } from "../../../src/core/runtime/watchdog.js";
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
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false
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

  it("treats META_REVIEW_RUNNING as watchdog-monitored from execution_context authority (including recovery with null active_agent) while keeping human-only states unmonitored", () => {
    const metaRunning = computeWatchdogStatus(
      createState({
        state: "META_REVIEW_RUNNING",
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
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      }),
      5,
      new Date("2026-02-22T12:04:00.000Z")
    );
    const metaRunningRecovery = computeWatchdogStatus(
      createState({
        state: "META_REVIEW_RUNNING",
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
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
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
});
