import { describe, expect, it } from "vitest";

import { normalizeMergeBubbleInput } from "../../../../src/v11/shared/merge/mergeCommandInputNormalization.js";
import { BubbleMergeError } from "../../../../src/v11/shared/merge/mergeCommandErrorRuntime.js";

const createError = (message: string) => new BubbleMergeError(message);

describe("mergeCommandInputNormalization", () => {
  it("normalizes flags and now timestamp", () => {
    const now = new Date("2026-03-19T22:00:00.000Z");
    const normalized = normalizeMergeBubbleInput(
      {
        bubbleId: "b_merge_01",
        push: true,
        deleteRemote: false,
        now
      },
      createError
    );

    expect(normalized).toMatchObject({
      bubbleId: "b_merge_01",
      push: true,
      deleteRemote: false,
      now,
      nowIso: "2026-03-19T22:00:00.000Z"
    });
  });

  it("rejects empty bubble id", () => {
    expect(() =>
      normalizeMergeBubbleInput(
        {
          bubbleId: "   "
        },
        createError
      )
    ).toThrow(/Bubble id cannot be empty/u);
  });
});
