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
} from "../../../../src/v11/application/watchdog/emitWatchdogV11.js";

describe("watchdog facade parity", () => {
  it("keeps core watchdog exports aligned with v11 watchdog runtime contracts", () => {
    expect(runBubbleWatchdog).not.toBe(runBubbleWatchdogV11);
    expect(runBubbleWatchdog.length).toBe(runBubbleWatchdogV11.length);
    expect(asBubbleWatchdogError).toBe(asBubbleWatchdogErrorV11);
    expect(BubbleWatchdogError).toBe(BubbleWatchdogErrorV11);
  });
});
