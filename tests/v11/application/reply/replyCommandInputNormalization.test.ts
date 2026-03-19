import { describe, expect, it } from "vitest";

import { normalizeReplyCommandInput } from "../../../../src/v11/shared/reply/replyCommandInputNormalization.js";

describe("replyCommandInputNormalization", () => {
  it("normalizes message, refs and now defaults", () => {
    const normalized = normalizeReplyCommandInput({
      message: "  human reply  ",
      refs: ["artifact://a.md", "artifact://a.md", " ", "artifact://b.md"],
      createError: (message) => new Error(message)
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
      createError: (message) => new Error(`reply:${message}`)
    });

    expect(normalized.now).toBe(now);
    expect(normalized.nowIso).toBe("2026-03-19T23:10:00.000Z");

    expect(() =>
      normalizeReplyCommandInput({
        message: "   ",
        refs: [],
        createError: (message) => new Error(`reply:${message}`)
      })
    ).toThrow("reply:Reply message");
  });
});
