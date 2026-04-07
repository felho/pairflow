import { describe, expect, it } from "vitest";

import {
  asBubbleWatchdogError,
  BubbleWatchdogError,
  runBubbleWatchdog
} from "../../../../src/core/bubble/watchdogBubble.js";
import {
  asBubbleWatchdogErrorV11,
  BubbleWatchdogErrorV11,
  runBubbleWatchdogV11
} from "../../../../src/v11/infrastructure/watchdog/emitWatchdogV11.js";

describe("watchdog facade parity", () => {
  it("keeps core watchdog exports aligned with v11 runtime facade exports", () => {
    expect(runBubbleWatchdog).toBe(runBubbleWatchdogV11);
    expect(asBubbleWatchdogError).toBe(asBubbleWatchdogErrorV11);
    expect(BubbleWatchdogError).toBe(BubbleWatchdogErrorV11);
  });
});
