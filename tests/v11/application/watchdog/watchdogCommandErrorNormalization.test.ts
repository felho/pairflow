import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import {
  BubbleWatchdogError,
  createBubbleWatchdogError
} from "../../../../src/v11/application/watchdog/watchdogCommandRuntime.js";
import { normalizeBubbleWatchdogError } from "../../../../src/v11/application/watchdog/watchdogCommandErrorNormalization.js";

describe("watchdogCommandErrorNormalization", () => {
  it("preserves BubbleWatchdogError instances", () => {
    const original = new BubbleWatchdogError("already-normalized");
    const normalized = normalizeBubbleWatchdogError({
      error: original,
      isBubbleWatchdogError: (candidate) => candidate instanceof BubbleWatchdogError,
      createBubbleWatchdogError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError
    });
    expect(normalized).toBe(original);
  });

  it("maps bubble lookup and generic errors to BubbleWatchdogError", () => {
    const fromLookup = normalizeBubbleWatchdogError({
      error: new BubbleLookupError("bubble not found"),
      isBubbleWatchdogError: (candidate) => candidate instanceof BubbleWatchdogError,
      createBubbleWatchdogError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError
    });
    expect(fromLookup).toBeInstanceOf(BubbleWatchdogError);
    expect((fromLookup as Error).message).toBe("bubble not found");

    const fromGeneric = normalizeBubbleWatchdogError({
      error: new Error("unexpected"),
      isBubbleWatchdogError: (candidate) => candidate instanceof BubbleWatchdogError,
      createBubbleWatchdogError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError
    });
    expect(fromGeneric).toBeInstanceOf(BubbleWatchdogError);
    expect((fromGeneric as Error).message).toBe("unexpected");
  });
});
