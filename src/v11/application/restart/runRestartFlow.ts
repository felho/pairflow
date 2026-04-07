import type { RestartBubbleResult } from "./restartCommandContract.js";
import type { NormalizedRestartBubbleInput } from "./restartCommandInputNormalization.js";
import type { ResolvedRestartBubbleDependencies } from "./restartCommandDependencyResolution.js";

export async function runRestartFlow(
  input: NormalizedRestartBubbleInput,
  dependencies: ResolvedRestartBubbleDependencies
): Promise<RestartBubbleResult> {
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const markerPersistence = await dependencies.persistPassValidationRecoveryMarker({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    flow: "restart",
    ...(resolved.bubblePaths.worktreePath !== undefined
      ? { worktreePath: resolved.bubblePaths.worktreePath }
      : {}),
    ...(input.now !== undefined ? { now: input.now } : {})
  });

  const terminated = await dependencies.terminateBubbleTmuxSession({
    bubbleId: resolved.bubbleId
  });
  const removed = await dependencies.removeRuntimeSession({
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId
  });

  const started = await dependencies.startBubble({
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
    previousRuntimeSessionRemoved: removed,
    ...(markerPersistence.warnings.length > 0
      ? { warnings: markerPersistence.warnings }
      : {})
  };
}
