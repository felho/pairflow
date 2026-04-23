import { describe, expect, it } from "vitest";

import {
  executionContextsEqual,
  buildRestartedExecutionContext,
  buildRunningExecutionContext
} from "../../../src/v11/shared/state/executionContext.js";

describe("buildRunningExecutionContext", () => {
  it("builds canonical running authority for pass actors", () => {
    const executionContext = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_01",
      round: 2,
      activeRole: "reviewer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 45
    });

    expect(executionContext).toMatchObject({
      active_role: "reviewer",
      awaited_output_type: "pass_result",
      handoff_id: "reviewer:b_exec_ctx_01:round:2:attempt:1",
      round: 2,
      started_at: "2026-03-19T12:00:00.000Z",
      deadline_at: "2026-03-19T12:45:00.000Z",
      attempt: 1
    });
    expect(executionContext.execution_id).toMatch(/^exec_[0-9a-f]{24}$/u);
  });

  it("builds canonical running authority for meta-review actors", () => {
    const executionContext = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_meta_01",
      round: 3,
      activeRole: "meta_reviewer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 45
    });

    expect(executionContext).toMatchObject({
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      handoff_id: "meta_review:b_exec_ctx_meta_01:round:3:attempt:1",
      round: 3,
      started_at: "2026-03-19T12:00:00.000Z",
      deadline_at: "2026-03-19T12:45:00.000Z",
      attempt: 1
    });
    expect(executionContext.execution_id).toMatch(/^exec_[0-9a-f]{24}$/u);
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

  it("builds a restarted execution context with a fresh handoff attempt", () => {
    const previousExecutionContext = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_05",
      round: 2,
      activeRole: "implementer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 30
    });

    const restartedExecutionContext = buildRestartedExecutionContext({
      bubbleId: "b_exec_ctx_05",
      round: 2,
      activeRole: "implementer",
      restartedAt: "2026-03-19T13:00:00.000Z",
      watchdogTimeoutMinutes: 30,
      previousExecutionContext
    });

    expect(restartedExecutionContext).toMatchObject({
      active_role: "implementer",
      awaited_output_type: "pass_result",
      handoff_id: "implementer:b_exec_ctx_05:round:2:attempt:2",
      round: 2,
      started_at: "2026-03-19T13:00:00.000Z",
      deadline_at: "2026-03-19T13:30:00.000Z",
      attempt: 2
    });
    expect(restartedExecutionContext.execution_id).toMatch(/^exec_[0-9a-f]{24}$/u);
    expect(restartedExecutionContext.execution_id).not.toBe(
      previousExecutionContext.execution_id
    );
  });

  it("rejects restarted contexts when the previous role no longer matches", () => {
    expect(() =>
      buildRestartedExecutionContext({
        bubbleId: "b_exec_ctx_06",
        round: 2,
        activeRole: "implementer",
        restartedAt: "2026-03-19T13:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        previousExecutionContext: {
          active_role: "reviewer",
          awaited_output_type: "pass_result",
          handoff_id: "reviewer:b_exec_ctx_06:round:2:attempt:1",
          execution_id: "exec_previous_ctx_06",
          round: 2,
          started_at: "2026-03-19T12:00:00.000Z",
          deadline_at: "2026-03-19T12:30:00.000Z",
          attempt: 1
        }
      })
    ).toThrowError(
      new RangeError(
        "restarted execution context requires matching active role: reviewer !== implementer"
      )
    );
  });

  it("rejects restarted contexts when the previous round no longer matches", () => {
    expect(() =>
      buildRestartedExecutionContext({
        bubbleId: "b_exec_ctx_07",
        round: 3,
        activeRole: "implementer",
        restartedAt: "2026-03-19T13:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        previousExecutionContext: {
          active_role: "implementer",
          awaited_output_type: "pass_result",
          handoff_id: "implementer:b_exec_ctx_07:round:2:attempt:1",
          execution_id: "exec_previous_ctx_07",
          round: 2,
          started_at: "2026-03-19T12:00:00.000Z",
          deadline_at: "2026-03-19T12:30:00.000Z",
          attempt: 1
        }
      })
    ).toThrowError(
      new RangeError(
        "restarted execution context requires matching round: 2 !== 3"
      )
    );
  });

  it("rejects restarted contexts when awaited output type diverges from the active role", () => {
    expect(() =>
      buildRestartedExecutionContext({
        bubbleId: "b_exec_ctx_08",
        round: 2,
        activeRole: "implementer",
        restartedAt: "2026-03-19T13:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        previousExecutionContext: {
          active_role: "implementer",
          awaited_output_type: "meta_review_result",
          handoff_id: "implementer:b_exec_ctx_08:round:2:attempt:1",
          execution_id: "exec_previous_ctx_08",
          round: 2,
          started_at: "2026-03-19T12:00:00.000Z",
          deadline_at: "2026-03-19T12:30:00.000Z",
          attempt: 1
        }
      })
    ).toThrowError(
      "restarted execution context requires matching awaited output type: meta_review_result !== pass_result"
    );
  });

  it("treats execution_id as part of canonical same-authority equality", () => {
    const left = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_09",
      round: 2,
      activeRole: "implementer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 30
    });
    const right = {
      ...left,
      execution_id: "exec_different_ctx_09"
    };

    expect(executionContextsEqual(left, right)).toBe(false);
  });
});
