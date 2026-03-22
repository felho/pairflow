import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { buildAskHumanRoutingInput } from "../../../../src/v11/shared/askHuman/askHumanRoutingInvocationBuilder.js";

describe("askHumanRoutingInvocationBuilder", () => {
  it("omits undefined optional fields", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const routingInput = buildAskHumanRoutingInput({
      question: "Need migration decision?",
      refs: undefined,
      cwd: undefined,
      now,
      createError
    });

    expect(routingInput).toEqual({
      question: "Need migration decision?",
      now,
      createError
    });
    expect("refs" in routingInput).toBe(false);
    expect("cwd" in routingInput).toBe(false);
  });

  it("forwards optional fields when provided", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const routingInput = buildAskHumanRoutingInput({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now,
      createError
    });

    expect(routingInput).toEqual({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now,
      createError
    });
  });
});
