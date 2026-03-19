import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { GitCommandError } from "../../../core/workspace/git.js";
import { WorkspaceCleanupError } from "../../../core/workspace/worktreeManager.js";
import { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";
import { normalizeBubbleMergeError } from "./mergeCommandErrorNormalization.js";

export class BubbleMergeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleMergeError";
  }
}

export function createBubbleMergeError(message: string): BubbleMergeError {
  return new BubbleMergeError(message);
}

export function throwAsBubbleMergeError(error: unknown): never {
  throw normalizeBubbleMergeError({
    error,
    isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
    createBubbleMergeError,
    isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
      candidate instanceof BubbleLookupError,
    isGitCommandError: (candidate): candidate is GitCommandError =>
      candidate instanceof GitCommandError,
    isWorkspaceCleanupError: (candidate): candidate is WorkspaceCleanupError =>
      candidate instanceof WorkspaceCleanupError,
    isTmuxCommandError: (candidate): candidate is TmuxCommandError =>
      candidate instanceof TmuxCommandError,
    isRuntimeSessionsRegistryError:
      (candidate): candidate is RuntimeSessionsRegistryError =>
        candidate instanceof RuntimeSessionsRegistryError,
    isRuntimeSessionsRegistryLockError:
      (candidate): candidate is RuntimeSessionsRegistryLockError =>
        candidate instanceof RuntimeSessionsRegistryLockError
  });
}
