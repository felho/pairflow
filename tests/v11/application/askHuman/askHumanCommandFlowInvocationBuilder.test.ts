import { describe, expect, it } from "vitest";

import { buildAskHumanFlowInputFromCommandOrchestration } from "../../../../src/v11/shared/askHuman/askHumanCommandFlowInvocationBuilder.js";

class AskHumanFlowInvocationTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanFlowInvocationTestError";
  }
}

describe("askHumanCommandFlowInvocationBuilder", () => {
  it("maps orchestration input and routing context into flow input", () => {
    const now = new Date("2026-03-19T21:30:00.000Z");
    const routing = {
      question: "Need migration decision?"
    } as never;
    const createError = (message: string) =>
      new AskHumanFlowInvocationTestError(message);

    const flowInput = buildAskHumanFlowInputFromCommandOrchestration(
      {
        question: "Need migration decision?",
        refs: ["artifact://analysis.md"],
        cwd: "/repo/worktrees/b_ask_human_01",
        now,
        createError
      },
      routing
    );

    expect(flowInput).toEqual({
      now,
      routing,
      createError
    });
    expect(flowInput.createError("x")).toBeInstanceOf(
      AskHumanFlowInvocationTestError
    );
  });
});
