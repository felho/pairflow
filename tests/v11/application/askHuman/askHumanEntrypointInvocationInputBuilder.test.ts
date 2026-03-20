import { describe, expect, it } from "vitest";

import { buildAskHumanEntrypointInvocationInput } from "../../../../src/v11/shared/askHuman/askHumanEntrypointInvocationInputBuilder.js";

describe("askHumanEntrypointInvocationInputBuilder", () => {
  it("builds entrypoint invocation input from normalized payload and error factory", () => {
    const now = new Date("2026-03-20T09:10:00.000Z");
    const normalizedInput = {
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now
    };
    const createError = (message: string) => new Error(message);

    const input = buildAskHumanEntrypointInvocationInput(
      normalizedInput,
      createError
    );

    expect(input).toEqual({
      normalizedInput,
      createError
    });
  });
});
