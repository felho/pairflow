import { describe, expect, it } from "vitest";

import { kickoffBubble } from "../../../../src/core/bubble/kickoffBubble.js";
import { kickoffBubbleV11 } from "../../../../src/v11/application/kickoff/emitKickoffV11.js";

describe("kickoff facade parity", () => {
  it("keeps core kickoff exports aligned with v11 source-of-truth exports", () => {
    expect(kickoffBubble).toBe(kickoffBubbleV11);
  });
});
