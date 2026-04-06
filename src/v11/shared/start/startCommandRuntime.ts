import { BubbleLookupError } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { WorkspaceBootstrapError } from "../../infrastructure/workspace/worktreeManager.js";
import {
  TmuxCommandError,
  TmuxSessionExistsError
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { normalizeStartBubbleError } from "./startCommandErrorNormalization.js";
import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../errors/commandErrorDetails.js";

export class StartBubbleError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "StartBubbleError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "start");
  }
}

export function createStartBubbleError(
  input: PairflowCommandErrorInput
): StartBubbleError {
  return new StartBubbleError(input);
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
