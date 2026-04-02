import { describe, expect, it } from "vitest";

import { buildRunningExecutionContext } from "../../../src/core/state/executionContext.js";

describe("buildRunningExecutionContext", () => {
  it("builds canonical running authority for pass actors", () => {
    expect(
      buildRunningExecutionContext({
        bubbleId: "b_exec_ctx_01",
        round: 2,
        activeRole: "reviewer",
        startedAt: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 45
      })
    ).toEqual({
      active_role: "reviewer",
      awaited_output_type: "pass_result",
      handoff_id: "reviewer:b_exec_ctx_01:round:2:attempt:1",
      round: 2,
      started_at: "2026-03-19T12:00:00.000Z",
      deadline_at: "2026-03-19T12:45:00.000Z",
      attempt: 1
    });
  });

  it("rejects zero-minute watchdog windows", () => {
    expect(() =>
      buildRunningExecutionContext({
        bubbleId: "b_exec_ctx_02",
        round: 1,
        activeRole: "implementer",
        startedAt: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 0
      })
    ).toThrowError(
      new RangeError(
        "running execution context requires a positive finite watchdog timeout: 0"
      )
    );
  });

  it("rejects round 0 running execution contexts", () => {
    expect(() =>
      buildRunningExecutionContext({
        bubbleId: "b_exec_ctx_03",
        round: 0,
        activeRole: "implementer",
        startedAt: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 30
      })
    ).toThrowError(
      new RangeError("running execution context requires round >= 1: 0")
    );
  });

  it("rejects attempt values below 1", () => {
    expect(() =>
      buildRunningExecutionContext({
        bubbleId: "b_exec_ctx_04",
        round: 1,
        activeRole: "implementer",
        startedAt: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        attempt: 0
      })
    ).toThrowError(
      new RangeError("running execution context requires attempt >= 1: 0")
    );
  });
});
