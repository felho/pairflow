import { BubbleLookupError } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { GitCommandError } from "../../infrastructure/workspace/git.js";
import {
  BubbleCommitError,
  createBubbleCommitError,
  isBubbleCommitError
} from "./commitCommandError.js";
import { normalizeBubbleCommitError } from "./commitCommandErrorNormalization.js";

export { BubbleCommitError };

export function throwAsBubbleCommitError(error: unknown): never {
  throw normalizeBubbleCommitError({
    error,
    isBubbleCommitError,
    createBubbleCommitError,
    isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError,
    isGitCommandError: (candidate) => candidate instanceof GitCommandError
  });
}
