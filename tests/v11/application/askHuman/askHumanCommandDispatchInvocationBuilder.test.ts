import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { buildAskHumanCommandDispatchInvocation } from "../../../../src/v11/application/askHuman/askHumanCommandDispatchInvocationBuilder.js";

describe("askHumanCommandDispatchInvocationBuilder", () => {
  it("builds orchestration invocation input from command dispatch inputs", () => {
    const now = new Date("2026-03-20T08:00:00.000Z");
    const commandInput = {
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now
    };
    const dependencies = {
      emitDeliveryNotificationAck: (() => Promise.resolve({})) as never,
      emitBubbleNotification: (() => Promise.resolve({})) as never
    };
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const invocation = buildAskHumanCommandDispatchInvocation(
      commandInput,
      dependencies,
      createError
    );

    expect(invocation).toEqual({
      commandInput,
      runtimeDependencies: dependencies,
      createError
    });
  });
});
