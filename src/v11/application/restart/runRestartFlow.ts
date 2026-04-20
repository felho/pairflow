import type { RestartBubbleResult } from "./restartCommandContract.js";
import type { NormalizedRestartBubbleInput } from "./restartCommandInputNormalization.js";
import type { ResolvedRestartBubbleDependencies } from "./restartCommandDependencyResolution.js";
import { createRestartBubbleError } from "./restartCommandRuntime.js";

async function assertRemoteStartedRestartUnsupported(input: {
  resolved: Awaited<ReturnType<ResolvedRestartBubbleDependencies["resolveBubbleById"]>>;
  dependencies: ResolvedRestartBubbleDependencies;
}): Promise<void> {
  const remotePointer = await input.dependencies.readRemotePointer(
    input.resolved.bubblePaths.remotePointerPath
  );
  if (remotePointer?.kind !== "started") {
    return;
  }

  throw createRestartBubbleError({
    reasonCode: "RESTART_REMOTE_STARTED_UNSUPPORTED",
    message:
      `Bubble ${input.resolved.bubbleId} uses preserved remote started-state authority; restart is fail-closed in this phase and must not fall back to local runtime recovery.`,
    context: {
      bubble_id: input.resolved.bubbleId,
      remote_pointer_kind: remotePointer.kind,
      remote_host: remotePointer.host,
      remote_clone_path: remotePointer.remoteClonePath,
      tmux_session_name: remotePointer.tmuxSession
    }
  });
}

export async function runRestartFlow(
  input: NormalizedRestartBubbleInput,
  dependencies: ResolvedRestartBubbleDependencies
): Promise<RestartBubbleResult> {
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  await assertRemoteStartedRestartUnsupported({
    resolved,
    dependencies
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
