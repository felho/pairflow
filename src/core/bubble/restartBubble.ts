import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import {
  removeRuntimeSession,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../runtime/sessionsRegistry.js";
import {
  terminateBubbleTmuxSession,
  TmuxCommandError
} from "../runtime/tmuxManager.js";
import {
  asStartBubbleError,
  startBubble,
  StartBubbleError,
  type StartBubbleResult
} from "./startBubble.js";

export interface RestartBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface RestartBubbleResult {
  bubbleId: string;
  state: StartBubbleResult["state"];
  tmuxSessionName: string;
  worktreePath: string;
  previousTmuxSessionExisted: boolean;
  previousRuntimeSessionRemoved: boolean;
}

export interface RestartBubbleDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
  startBubble?: typeof startBubble;
}

export class RestartBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RestartBubbleError";
  }
}

export async function restartBubble(
  input: RestartBubbleInput,
  dependencies: RestartBubbleDependencies = {}
): Promise<RestartBubbleResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const terminateTmux =
    dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession;
  const removeSession = dependencies.removeRuntimeSession ?? removeRuntimeSession;
  const runStartBubble = dependencies.startBubble ?? startBubble;

  try {
    const resolved = await resolveBubble({
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    });

    const terminated = await terminateTmux({
      bubbleId: resolved.bubbleId
    });
    const removed = await removeSession({
      sessionsPath: resolved.bubblePaths.sessionsPath,
      bubbleId: resolved.bubbleId
    });

    const started = await runStartBubble({
      bubbleId: resolved.bubbleId,
      repoPath: resolved.repoPath,
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
      ...(input.now !== undefined ? { now: input.now } : {})
    });

    return {
      bubbleId: started.bubbleId,
      state: started.state,
      tmuxSessionName: started.tmuxSessionName,
      worktreePath: started.worktreePath,
      previousTmuxSessionExisted: terminated.existed,
      previousRuntimeSessionRemoved: removed
    };
  } catch (error) {
    asRestartBubbleError(error);
  }
}

export function asRestartBubbleError(error: unknown): never {
  if (error instanceof RestartBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new RestartBubbleError(error.message);
  }
  if (error instanceof TmuxCommandError) {
    throw new RestartBubbleError(error.message);
  }
  if (
    error instanceof RuntimeSessionsRegistryError ||
    error instanceof RuntimeSessionsRegistryLockError
  ) {
    throw new RestartBubbleError(error.message);
  }
  if (error instanceof StartBubbleError) {
    throw new RestartBubbleError(error.message);
  }

  try {
    asStartBubbleError(error);
  } catch (startError) {
    if (startError instanceof StartBubbleError) {
      throw new RestartBubbleError(startError.message);
    }
    if (startError instanceof Error) {
      throw new RestartBubbleError(startError.message);
    }
    throw startError;
  }
}
