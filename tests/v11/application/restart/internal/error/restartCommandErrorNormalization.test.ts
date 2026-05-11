import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import type { TmuxCommandError } from "../../../../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";
import type {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { StartBubbleError } from "../../../../../../src/v11/application/start/startCommandApi.js";
import {
  RestartBubbleError,
  createRestartBubbleError
} from "../../../../../../src/v11/application/restart/internal/error/restartCommandRuntime.js";
import { normalizeRestartBubbleError } from "../../../../../../src/v11/application/restart/internal/error/restartCommandErrorNormalization.js";

describe("restartCommandErrorNormalization", () => {
  it("preserves restart bubble errors", () => {
    const original = new RestartBubbleError("already-normalized");
    const normalized = normalizeRestartBubbleError({
      error: original,
      isRestartBubbleError: (candidate) => candidate instanceof RestartBubbleError,
      createRestartBubbleError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError,
      isTmuxCommandError: (_candidate): _candidate is TmuxCommandError => false,
      isRuntimeSessionsRegistryError:
        (_candidate): _candidate is RuntimeSessionsRegistryError => false,
      isRuntimeSessionsRegistryLockError:
        (_candidate): _candidate is RuntimeSessionsRegistryLockError => false,
      isStartBubbleError: (_candidate): _candidate is StartBubbleError => false,
      asStartBubbleError: () => {
        throw new Error("should not run");
      }
    });

    expect(normalized).toBe(original);
  });

  it("maps bubble lookup errors to restart bubble error", () => {
    const normalized = normalizeRestartBubbleError({
      error: new BubbleLookupError("missing bubble"),
      isRestartBubbleError: (candidate) => candidate instanceof RestartBubbleError,
      createRestartBubbleError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError,
      isTmuxCommandError: (_candidate): _candidate is TmuxCommandError => false,
      isRuntimeSessionsRegistryError:
        (_candidate): _candidate is RuntimeSessionsRegistryError => false,
      isRuntimeSessionsRegistryLockError:
        (_candidate): _candidate is RuntimeSessionsRegistryLockError => false,
      isStartBubbleError: (_candidate): _candidate is StartBubbleError => false,
      asStartBubbleError: () => {
        throw new Error("should not run");
      }
    });

    expect(normalized).toBeInstanceOf(RestartBubbleError);
    expect((normalized as Error).message).toBe("missing bubble");
  });
});
