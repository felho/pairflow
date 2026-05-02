import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { assertAskHumanRunningState } from "../../../../src/v11/application/askHuman/askHumanRunningStateValidation.js";

class AskHumanRunningStateValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanRunningStateValidationError";
  }
}

describe("askHumanRunningStateValidation", () => {
  it("accepts valid RUNNING state", () => {
    expect(() =>
      assertAskHumanRunningState(
        {
          state: "RUNNING",
          round: 2,
          active_agent: "codex",
          active_role: "implementer",
          active_since: "2026-02-21T12:00:00.000Z"
        } as never,
        (message: PairflowCommandErrorInput) => new AskHumanRunningStateValidationError(toErrorMessage(message))
      )
    ).not.toThrow();
  });

  it("preserves reviewer-origin human-question baseline while RUNNING", () => {
    expect(() =>
      assertAskHumanRunningState(
        {
          state: "RUNNING",
          round: 2,
          active_agent: "claude",
          active_role: "reviewer",
          active_since: "2026-02-21T12:00:00.000Z"
        } as never,
        (message: PairflowCommandErrorInput) =>
          new AskHumanRunningStateValidationError(toErrorMessage(message))
      )
    ).not.toThrow();
  });

  it("rejects invalid RUNNING constraints with preserved messages", () => {
    expect(() =>
      assertAskHumanRunningState(
        {
          state: "RUNNING",
          round: 0,
          active_agent: "codex",
          active_role: "implementer",
          active_since: "2026-02-21T12:00:00.000Z"
        } as never,
        (message: PairflowCommandErrorInput) => new AskHumanRunningStateValidationError(toErrorMessage(message))
      )
    ).toThrow("RUNNING state must have round >= 1 (found 0).");

    expect(() =>
      assertAskHumanRunningState(
        {
          state: "RUNNING",
          round: 2,
          active_agent: null,
          active_role: "implementer",
          active_since: "2026-02-21T12:00:00.000Z"
        } as never,
        (message: PairflowCommandErrorInput) => new AskHumanRunningStateValidationError(toErrorMessage(message))
      )
    ).toThrow(
      "RUNNING state is missing active agent context; cannot emit HUMAN_QUESTION."
    );

    expect(() =>
      assertAskHumanRunningState(
        {
          state: "RUNNING",
          round: 2,
          active_agent: "meta-reviewer",
          active_role: "meta_reviewer",
          active_since: "2026-02-21T12:00:00.000Z"
        } as never,
        (message: PairflowCommandErrorInput) => new AskHumanRunningStateValidationError(toErrorMessage(message))
      )
    ).toThrow(
      "ask-human cannot be used from meta_reviewer role while bubble is RUNNING."
    );
  });
});
