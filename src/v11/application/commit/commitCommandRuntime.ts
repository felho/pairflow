import {
  BubbleCommitError,
  createBubbleCommitError,
  isBubbleCommitError
} from "../../shared/commit/commitCommandError.js";
import { normalizeBubbleCommitError } from "../../shared/commit/commitCommandErrorNormalization.js";
import { isNamedError } from "../../shared/errors/namedError.js";

export { BubbleCommitError };

export function throwAsBubbleCommitError(error: unknown): never {
  throw normalizeBubbleCommitError({
    error,
    isBubbleCommitError,
    createBubbleCommitError,
    isBubbleLookupError: (candidate) =>
      isNamedError(candidate, "BubbleLookupError"),
    isGitCommandError: (candidate) =>
      isNamedError(candidate, "GitCommandError"),
    isRemoteBubbleCommitCommandError: (candidate) =>
      isNamedError(candidate, "RemoteBubbleCommitCommandError"),
    isRemoteBubbleStatusError: (candidate) =>
      isNamedError(candidate, "RemoteBubbleStatusError")
  });
}
