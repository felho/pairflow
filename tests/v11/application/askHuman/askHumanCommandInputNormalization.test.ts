import { describe, expect, it } from "vitest";

import { normalizeAskHumanCommandInput } from "../../../../src/v11/application/askHuman/internal/mutation/askHumanCommandInputNormalization.js";

describe("askHumanCommandInputNormalization", () => {
  it("preserves provided fields including now", () => {
    const now = new Date("2026-03-19T21:20:00.000Z");

    const normalized = normalizeAskHumanCommandInput({
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

  it("creates current time and omits undefined optional fields", () => {
    const normalized = normalizeAskHumanCommandInput({
      question: "Need operator input"
    });

    expect(normalized.question).toBe("Need operator input");
    expect(normalized.now).toBeInstanceOf(Date);
    expect("refs" in normalized).toBe(false);
    expect("cwd" in normalized).toBe(false);
  });
});
