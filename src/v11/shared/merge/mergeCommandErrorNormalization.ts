import type { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import type { GitCommandError } from "../../../core/workspace/git.js";
import type { WorkspaceCleanupError } from "../../../core/workspace/worktreeManager.js";
import type { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import type {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";

export interface NormalizeBubbleMergeErrorInput {
  error: unknown;
  isBubbleMergeError: (candidate: unknown) => boolean;
  createBubbleMergeError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => candidate is BubbleLookupError;
  isGitCommandError: (candidate: unknown) => candidate is GitCommandError;
  isWorkspaceCleanupError: (candidate: unknown) => candidate is WorkspaceCleanupError;
  isTmuxCommandError: (candidate: unknown) => candidate is TmuxCommandError;
  isRuntimeSessionsRegistryError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryError;
  isRuntimeSessionsRegistryLockError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryLockError;
}

export function normalizeBubbleMergeError(
  input: NormalizeBubbleMergeErrorInput
): unknown {
  if (input.isBubbleMergeError(input.error)) {
    return input.error;
  }
  if (
    input.isBubbleLookupError(input.error) ||
    input.isGitCommandError(input.error) ||
    input.isWorkspaceCleanupError(input.error) ||
    input.isTmuxCommandError(input.error) ||
    input.isRuntimeSessionsRegistryError(input.error) ||
    input.isRuntimeSessionsRegistryLockError(input.error)
  ) {
    return input.createBubbleMergeError(input.error.message);
  }
  if (input.error instanceof Error) {
    return input.createBubbleMergeError(input.error.message);
  }
  return input.error;
}
