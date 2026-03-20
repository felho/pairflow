import { describe, expect, it } from "vitest";

import { buildAskHumanCommandDispatchInvocation } from "../../../../src/v11/shared/askHuman/askHumanCommandDispatchInvocationBuilder.js";

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
      emitTmuxDeliveryNotification: (() => Promise.resolve({})) as never,
      emitBubbleNotification: (() => Promise.resolve({})) as never
    };
    const createError = (message: string) => new Error(message);

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
