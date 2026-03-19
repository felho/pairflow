import { describe, expect, it } from "vitest";

import { buildAskHumanEntrypointInvocation } from "../../../../src/v11/shared/askHuman/askHumanEntrypointInvocationBuilder.js";

describe("askHumanEntrypointInvocationBuilder", () => {
  it("maps normalized input to orchestration input contract", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const createError = (message: string) => new Error(message);

    expect(
      buildAskHumanEntrypointInvocation({
        normalizedInput: {
          question: "Need migration decision?",
          refs: ["artifact://analysis.md"],
          cwd: "/repo",
          now
        },
        createError
      })
    ).toEqual({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo",
      now,
      createError
    });
  });
});
