import { describe, expect, it } from "vitest";

import { buildAskHumanCommandDispatchInput } from "../../../../src/v11/shared/askHuman/askHumanCommandDispatchInputBuilder.js";

describe("askHumanCommandDispatchInputBuilder", () => {
  it("builds command dispatch input from api arguments", () => {
    const now = new Date("2026-03-20T08:35:00.000Z");
    const input = {
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

    const dispatchInput = buildAskHumanCommandDispatchInput(
      input,
      dependencies,
      createError
    );

    expect(dispatchInput).toEqual({
      input,
      dependencies,
      createError
    });
  });
});
