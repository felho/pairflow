import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { buildAskHumanOrchestrationInput } from "../../../../src/v11/shared/askHuman/askHumanOrchestrationInputBuilder.js";

describe("askHumanOrchestrationInputBuilder", () => {
  it("maps normalized command input into orchestration input", () => {
    const now = new Date("2026-03-20T10:00:00.000Z");
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const orchestrationInput = buildAskHumanOrchestrationInput(
      {
        question: "Need migration decision?",
        refs: ["artifact://analysis.md"],
        cwd: "/repo/worktrees/b_ask_human_01",
        now
      },
      createError
    );

    expect(orchestrationInput).toEqual({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now,
      createError
    });
  });
});
