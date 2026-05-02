import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { buildAskHumanCommandFlowOrchestrationCallInput } from "../../../../src/v11/application/askHuman/askHumanCommandFlowOrchestrationCallInputBuilder.js";

describe("askHumanCommandFlowOrchestrationCallInputBuilder", () => {
  it("builds flow orchestration call input from orchestrator state", () => {
    const input = {
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now: new Date("2026-03-20T10:30:00.000Z"),
      createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
    };
    const dependencies = {
      executeAskHumanExecution: (async () => ({})) as never,
      finalizeAskHumanFlow: (async () => ({})) as never
    };
    const resolvedDependencies = {
      prepareAskHumanRouting: (async () => ({})) as never,
      runAskHumanFlow: (async () => ({})) as never
    };

    const callInput = buildAskHumanCommandFlowOrchestrationCallInput(
      input,
      dependencies,
      resolvedDependencies
    );

    expect(callInput).toEqual({
      input,
      dependencies,
      resolvedDependencies
    });
  });
});
