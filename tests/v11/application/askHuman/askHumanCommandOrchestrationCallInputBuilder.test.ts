import { describe, expect, it } from "vitest";

import { buildAskHumanCommandOrchestrationCallInput } from "../../../../src/v11/shared/askHuman/askHumanCommandOrchestrationCallInputBuilder.js";

describe("askHumanCommandOrchestrationCallInputBuilder", () => {
  it("maps orchestration invocation into orchestration call input", () => {
    const invocation = {
      orchestrationInput: {
        question: "Need migration decision?",
        refs: ["artifact://analysis.md"],
        cwd: "/repo/worktrees/b_ask_human_01",
        now: new Date("2026-03-20T09:30:00.000Z"),
        createError: (message: string) => new Error(message)
      },
      orchestrationDependencies: {
        executeAskHumanExecution: (async () => ({})) as never,
        finalizeAskHumanFlow: (async () => ({})) as never,
        runAskHumanFlow: (async () => ({})) as never,
        prepareAskHumanRouting: (async () => ({})) as never
      }
    };

    const callInput = buildAskHumanCommandOrchestrationCallInput(invocation);

    expect(callInput).toEqual({
      input: invocation.orchestrationInput,
      dependencies: invocation.orchestrationDependencies
    });
  });
});
