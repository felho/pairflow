import { describe, expect, it } from "vitest";

import {
  asRestartBubbleError,
  RestartBubbleError,
  restartBubble
} from "../../../../src/core/bubble/restartBubble.js";
import {
  asRestartBubbleErrorV11,
  RestartBubbleErrorV11,
  restartBubbleV11
} from "../../../../src/v11/application/restart/emitRestartV11.js";

describe("restart facade parity", () => {
  it("keeps core restart exports aligned with v11 source-of-truth exports", () => {
    expect(restartBubble).toBe(restartBubbleV11);
    expect(asRestartBubbleError).toBe(asRestartBubbleErrorV11);
    expect(RestartBubbleError).toBe(RestartBubbleErrorV11);
  });
});
