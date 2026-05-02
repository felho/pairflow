import { describe, expect, it } from "vitest";

import { buildNormalizedAskHumanCommandInput } from "../../../../src/v11/application/askHuman/askHumanCommandNormalizedInputBuilder.js";

describe("askHumanCommandNormalizedInputBuilder", () => {
  it("normalizes ask-human command input fields", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");

    const normalized = buildNormalizedAskHumanCommandInput({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now
    });

    expect(normalized).toEqual({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now
    });
  });
});
