import { describe, expect, it } from "vitest";

import { normalizeReplyCommandInput } from "../../../../src/v11/application/reply/replyCommandInputNormalization.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("replyCommandInputNormalization", () => {
  it("normalizes message, refs and now defaults", () => {
    const normalized = normalizeReplyCommandInput({
      message: "  human reply  ",
      refs: ["artifact://a.md", "artifact://a.md", " ", "artifact://b.md"],
      createError: (input) => new Error(toErrorMessage(input))
    });

    expect(normalized.message).toBe("human reply");
    expect(normalized.refs).toEqual(["artifact://a.md", "artifact://b.md"]);
    expect(normalized.now).toBeInstanceOf(Date);
    expect(normalized.nowIso).toBe(normalized.now.toISOString());
  });

  it("keeps provided now and rejects empty message via factory", () => {
    const now = new Date("2026-03-19T23:10:00.000Z");

    const normalized = normalizeReplyCommandInput({
      message: "Ack",
      refs: [],
      now,
      createError: (input) => new Error(`reply:${toErrorMessage(input)}`)
    });

    expect(normalized.now).toBe(now);
    expect(normalized.nowIso).toBe("2026-03-19T23:10:00.000Z");

    expect(() =>
      normalizeReplyCommandInput({
        message: "   ",
        refs: [],
        createError: (input) => new Error(`reply:${toErrorMessage(input)}`)
      })
    ).toThrow("reply:Reply message");
  });
});
