import { describe, expect, it } from "vitest";

import { buildAskHumanOrchestrationInput } from "../../../../src/v11/shared/askHuman/askHumanOrchestrationInputBuilder.js";

describe("askHumanOrchestrationInputBuilder", () => {
  it("maps normalized command input into orchestration input", () => {
    const now = new Date("2026-03-20T10:00:00.000Z");
    const createError = (message: string) => new Error(message);

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
