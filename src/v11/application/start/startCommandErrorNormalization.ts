import type { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import type { WorkspaceBootstrapError } from "../../../core/workspace/worktreeManager.js";
import type {
  TmuxCommandError,
  TmuxSessionExistsError
} from "../../../core/runtime/tmuxManager.js";
import type {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";

export interface NormalizeStartBubbleErrorInput {
  error: unknown;
  isStartBubbleError: (candidate: unknown) => boolean;
  createStartBubbleError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => candidate is BubbleLookupError;
  isWorkspaceBootstrapError:
    (candidate: unknown) => candidate is WorkspaceBootstrapError;
  isTmuxCommandError: (candidate: unknown) => candidate is TmuxCommandError;
  isTmuxSessionExistsError:
    (candidate: unknown) => candidate is TmuxSessionExistsError;
  isRuntimeSessionsRegistryError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryError;
  isRuntimeSessionsRegistryLockError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryLockError;
}

export function normalizeStartBubbleError(
  input: NormalizeStartBubbleErrorInput
): unknown {
  if (input.isStartBubbleError(input.error)) {
    return input.error;
  }
  if (input.isBubbleLookupError(input.error)) {
    return input.createStartBubbleError(input.error.message);
  }
  if (input.isWorkspaceBootstrapError(input.error)) {
    return input.createStartBubbleError(input.error.message);
  }
  if (
    input.isTmuxCommandError(input.error)
    || input.isTmuxSessionExistsError(input.error)
  ) {
    return input.createStartBubbleError(input.error.message);
  }
  if (
    input.isRuntimeSessionsRegistryError(input.error)
    || input.isRuntimeSessionsRegistryLockError(input.error)
  ) {
    return input.createStartBubbleError(input.error.message);
  }
  if (input.error instanceof Error) {
    return input.createStartBubbleError(input.error.message);
  }
  return input.error;
}
