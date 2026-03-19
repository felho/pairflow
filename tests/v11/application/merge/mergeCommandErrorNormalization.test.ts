import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/core/bubble/bubbleLookup.js";
import type { GitCommandError } from "../../../../src/core/workspace/git.js";
import type { WorkspaceCleanupError } from "../../../../src/core/workspace/worktreeManager.js";
import type { TmuxCommandError } from "../../../../src/core/runtime/tmuxManager.js";
import type {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../../src/core/runtime/sessionsRegistry.js";
import {
  BubbleMergeError,
  createBubbleMergeError
} from "../../../../src/v11/shared/merge/mergeCommandErrorRuntime.js";
import { normalizeBubbleMergeError } from "../../../../src/v11/shared/merge/mergeCommandErrorNormalization.js";

describe("mergeCommandErrorNormalization", () => {
  it("preserves bubble merge errors", () => {
    const original = new BubbleMergeError("already normalized");
    const normalized = normalizeBubbleMergeError({
      error: original,
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError,
      isGitCommandError: (_candidate): _candidate is GitCommandError => false,
      isWorkspaceCleanupError:
        (_candidate): _candidate is WorkspaceCleanupError => false,
      isTmuxCommandError: (_candidate): _candidate is TmuxCommandError => false,
      isRuntimeSessionsRegistryError:
        (_candidate): _candidate is RuntimeSessionsRegistryError => false,
      isRuntimeSessionsRegistryLockError:
        (_candidate): _candidate is RuntimeSessionsRegistryLockError => false
    });

    expect(normalized).toBe(original);
  });

  it("maps known command dependencies to bubble merge error", () => {
    const normalized = normalizeBubbleMergeError({
      error: new BubbleLookupError("bubble missing"),
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError,
      isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
        candidate instanceof BubbleLookupError,
      isGitCommandError: (_candidate): _candidate is GitCommandError => false,
      isWorkspaceCleanupError:
        (_candidate): _candidate is WorkspaceCleanupError => false,
      isTmuxCommandError: (_candidate): _candidate is TmuxCommandError => false,
      isRuntimeSessionsRegistryError:
        (_candidate): _candidate is RuntimeSessionsRegistryError => false,
      isRuntimeSessionsRegistryLockError:
        (_candidate): _candidate is RuntimeSessionsRegistryLockError => false
    });

    expect(normalized).toBeInstanceOf(BubbleMergeError);
    expect((normalized as Error).message).toBe("bubble missing");
  });
});
