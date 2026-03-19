import { resolveBubbleById } from "./bubbleLookup.js";
import {
  removeRuntimeSession
} from "../runtime/sessionsRegistry.js";
import {
  terminateBubbleTmuxSession
} from "../runtime/tmuxManager.js";
import {
  startBubble
} from "./startBubble.js";
import type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "../../v11/application/restart/restartCommandContract.js";
import {
  throwAsRestartBubbleError
} from "../../v11/shared/restart/restartCommandRuntime.js";
export type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "../../v11/application/restart/restartCommandContract.js";
export { RestartBubbleError } from "../../v11/shared/restart/restartCommandRuntime.js";

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
  throwAsRestartBubbleError(error);
}
