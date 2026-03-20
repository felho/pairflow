import { describe, expect, it } from "vitest";

import { buildAskHumanRoutingInputFromCommandOrchestration } from "../../../../src/v11/shared/askHuman/askHumanCommandRoutingInvocationBuilder.js";

describe("askHumanCommandRoutingInvocationBuilder", () => {
  it("maps command orchestration input into routing invocation input", () => {
    const now = new Date("2026-03-19T21:30:00.000Z");
    const createError = (message: string) => new Error(message);

    const routingInput = buildAskHumanRoutingInputFromCommandOrchestration({
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

  it("omits undefined optional fields", () => {
    const now = new Date("2026-03-19T21:30:00.000Z");
    const createError = (message: string) => new Error(message);

    const routingInput = buildAskHumanRoutingInputFromCommandOrchestration({
      question: "Need operator input",
      now,
      createError
    });

    expect(routingInput).toEqual({
      question: "Need operator input",
      now,
      createError
    });
    expect("refs" in routingInput).toBe(false);
    expect("cwd" in routingInput).toBe(false);
  });
});
