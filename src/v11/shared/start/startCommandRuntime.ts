import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { WorkspaceBootstrapError } from "../../../core/workspace/worktreeManager.js";
import {
  TmuxCommandError,
  TmuxSessionExistsError
} from "../../../core/runtime/tmuxManager.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";
import { normalizeStartBubbleError } from "./startCommandErrorNormalization.js";

export class StartBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StartBubbleError";
  }
}

export function createStartBubbleError(message: string): StartBubbleError {
  return new StartBubbleError(message);
}

export function throwAsStartBubbleError(error: unknown): never {
  throw normalizeStartBubbleError({
    error,
    isStartBubbleError: (candidate) => candidate instanceof StartBubbleError,
    createStartBubbleError,
    isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
      candidate instanceof BubbleLookupError,
    isWorkspaceBootstrapError: (candidate): candidate is WorkspaceBootstrapError =>
      candidate instanceof WorkspaceBootstrapError,
    isTmuxCommandError: (candidate): candidate is TmuxCommandError =>
      candidate instanceof TmuxCommandError,
    isTmuxSessionExistsError: (candidate): candidate is TmuxSessionExistsError =>
      candidate instanceof TmuxSessionExistsError,
    isRuntimeSessionsRegistryError:
      (candidate): candidate is RuntimeSessionsRegistryError =>
        candidate instanceof RuntimeSessionsRegistryError,
    isRuntimeSessionsRegistryLockError:
      (candidate): candidate is RuntimeSessionsRegistryLockError =>
        candidate instanceof RuntimeSessionsRegistryLockError
  });
}
