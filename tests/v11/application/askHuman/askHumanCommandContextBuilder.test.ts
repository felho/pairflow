import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { buildAskHumanCommandContext } from "../../../../src/v11/application/askHuman/askHumanCommandContextBuilder.js";

describe("askHumanCommandContextBuilder", () => {
  it("builds orchestration input while preserving command-level payload", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const context = buildAskHumanCommandContext({
      commandInput: {
        question: "  Need migration decision? ",
        refs: [" artifact://a ", "artifact://a", "artifact://b", " "],
        cwd: "/repo/worktrees/b_ask_human_01",
        now
      },
      createError
    });

    expect(context.orchestrationInput).toEqual({
      question: "  Need migration decision? ",
      refs: [" artifact://a ", "artifact://a", "artifact://b", " "],
      cwd: "/repo/worktrees/b_ask_human_01",
      now,
      createError
    });
  });
});
