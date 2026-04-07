import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { WorkspaceBootstrapError } from "../../../../src/v11/infrastructure/workspace/worktreeManager.js";
import {
  TmuxCommandError,
  TmuxSessionExistsError
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  StartBubbleError,
  throwAsStartBubbleError
} from "../../../../src/v11/shared/start/startCommandRuntime.js";

describe("startCommandErrorNormalization", () => {
  it("preserves start bubble errors", () => {
    const original = new StartBubbleError("already-normalized");

    try {
      throwAsStartBubbleError(original);
    } catch (error) {
      expect(error).toBe(original);
    }
  });

  it("maps known infrastructure errors to StartBubbleError", () => {
    const cases: Error[] = [
      new BubbleLookupError("missing bubble"),
      new WorkspaceBootstrapError("workspace bootstrap failed"),
      new TmuxCommandError(["has-session", "-t", "pf-b_1"], 1, "tmux failed"),
      new TmuxSessionExistsError("pf-b_1"),
      new RuntimeSessionsRegistryError("registry failed"),
      new RuntimeSessionsRegistryLockError("registry lock failed"),
      new Error("generic failure")
    ];

    for (const sampleError of cases) {
      try {
        throwAsStartBubbleError(sampleError);
      } catch (error) {
        expect(error).toBeInstanceOf(StartBubbleError);
        expect((error as Error).message).toBe(sampleError.message);
      }
    }
  });

  it("rethrows unknown non-error values unchanged", () => {
    const sample = { code: "UNKNOWN" };

    try {
      throwAsStartBubbleError(sample);
    } catch (error) {
      expect(error).toBe(sample);
    }
  });
});
