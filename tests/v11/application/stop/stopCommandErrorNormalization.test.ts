import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import type { TmuxCommandError } from "../../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";
import type {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  StopBubbleError,
  createStopBubbleError
} from "../../../../src/v11/shared/stop/stopCommandRuntime.js";
import { normalizeStopBubbleError } from "../../../../src/v11/shared/stop/stopCommandErrorNormalization.js";

describe("stopCommandErrorNormalization", () => {
  it("preserves existing StopBubbleError", () => {
    const original = new StopBubbleError("already normalized");
    const normalized = normalizeStopBubbleError({
      error: original,
      isStopBubbleError: (candidate) => candidate instanceof StopBubbleError,
      createStopBubbleError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError,
      isTmuxCommandError: (_candidate): _candidate is TmuxCommandError => false,
      isRuntimeSessionsRegistryError:
        (_candidate): _candidate is RuntimeSessionsRegistryError => false,
      isRuntimeSessionsRegistryLockError:
        (_candidate): _candidate is RuntimeSessionsRegistryLockError => false
    });

    expect(normalized).toBe(original);
  });

  it("maps known stop command dependencies to StopBubbleError", () => {
    const normalized = normalizeStopBubbleError({
      error: new BubbleLookupError("bubble missing"),
      isStopBubbleError: (candidate) => candidate instanceof StopBubbleError,
      createStopBubbleError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError,
      isTmuxCommandError: (_candidate): _candidate is TmuxCommandError => false,
      isRuntimeSessionsRegistryError:
        (_candidate): _candidate is RuntimeSessionsRegistryError => false,
      isRuntimeSessionsRegistryLockError:
        (_candidate): _candidate is RuntimeSessionsRegistryLockError => false
    });

    expect(normalized).toBeInstanceOf(StopBubbleError);
    expect((normalized as Error).message).toBe("bubble missing");
  });
});
