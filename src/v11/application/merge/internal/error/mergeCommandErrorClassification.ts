import {
  BubbleMergeError,
  createBubbleMergeError
} from "./mergeCommandErrorRuntime.js";
import { normalizeBubbleMergeError } from "./mergeCommandErrorNormalization.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";

export function throwAsBubbleMergeError(error: unknown): never {
  throw normalizeBubbleMergeError({
    error,
    isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
    createBubbleMergeError,
    isBubbleLookupError: (candidate) =>
      isNamedError(candidate, "BubbleLookupError"),
    isGitCommandError: (candidate) =>
      isNamedError(candidate, "GitCommandError"),
    isWorkspaceCleanupError: (candidate) =>
      isNamedError(candidate, "WorkspaceCleanupError"),
    isTmuxCommandError: (candidate) =>
      isNamedError(candidate, "TmuxCommandError"),
    isRuntimeSessionsRegistryError: (candidate) =>
      isNamedError(candidate, "RuntimeSessionsRegistryError"),
    isRuntimeSessionsRegistryLockError: (candidate) =>
      isNamedError(candidate, "RuntimeSessionsRegistryLockError"),
    isRemoteBubbleStatusError: (candidate) =>
      isNamedError(candidate, "RemoteBubbleStatusError"),
    isRemoteBubbleMergeCommandError: (candidate) =>
      isNamedError(candidate, "RemoteBubbleMergeCommandError")
  });
}
