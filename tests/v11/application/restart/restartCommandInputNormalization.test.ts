import { describe, expect, it } from "vitest";

import { normalizeRestartBubbleInput } from "../../../../src/v11/application/restart/restartCommandInputNormalization.js";
import { RestartBubbleError } from "../../../../src/v11/application/restart/restartCommandRuntime.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

const createError: PairflowCreateCommandError = (message) =>
  new RestartBubbleError(toErrorMessage(message));

describe("restartCommandInputNormalization", () => {
  it("normalizes optional fields", () => {
    const now = new Date("2026-03-19T22:00:00.000Z");
    const normalized = normalizeRestartBubbleInput(
      {
        bubbleId: "b_restart_01",
        repoPath: "/repo",
        cwd: "/repo/worktree",
        now
      },
      createError
    );

    expect(normalized).toEqual({
      bubbleId: "b_restart_01",
      repoPath: "/repo",
      cwd: "/repo/worktree",
      now
    });
  });

  it("rejects empty bubble id", () => {
    expect(() =>
      normalizeRestartBubbleInput(
        {
          bubbleId: "   "
        },
        createError
      )
    ).toThrow(/Bubble id cannot be empty/u);
  });
});
