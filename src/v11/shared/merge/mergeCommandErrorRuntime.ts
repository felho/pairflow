import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { GitCommandError } from "../../../core/workspace/git.js";
import { WorkspaceCleanupError } from "../../../core/workspace/worktreeManager.js";
import { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { normalizeBubbleMergeError } from "./mergeCommandErrorNormalization.js";
import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../errors/commandErrorDetails.js";

export class BubbleMergeError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "BubbleMergeError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "merge");
  }
}

export function createBubbleMergeError(
  input: PairflowCommandErrorInput
): BubbleMergeError {
  return new BubbleMergeError(input);
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
