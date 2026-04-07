import {
  BubbleCommitError,
  createBubbleCommitError,
  isBubbleCommitError
} from "../../shared/commit/commitCommandError.js";
import { normalizeBubbleCommitError } from "../../shared/commit/commitCommandErrorNormalization.js";

export { BubbleCommitError };

function isNamedError(candidate: unknown, expectedName: string): boolean {
  return candidate instanceof Error && candidate.name === expectedName;
}

export function throwAsBubbleCommitError(error: unknown): never {
  throw normalizeBubbleCommitError({
    error,
    isBubbleCommitError,
    createBubbleCommitError,
    isBubbleLookupError: (candidate) =>
      isNamedError(candidate, "BubbleLookupError"),
    isGitCommandError: (candidate) =>
      isNamedError(candidate, "GitCommandError")
  });
}
