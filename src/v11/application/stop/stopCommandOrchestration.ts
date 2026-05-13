import { isFinalState } from "../../domain/state/transitions.js";
import type {
  StopBubbleDependencies,
  StopBubbleInput,
  StopBubbleResult
} from "./stopCommandContract.js";
import {
  StopBubbleError,
  createStopBubbleError,
  throwAsStopBubbleError
} from "./internal/error/stopCommandRuntime.js";

const STOP_BUBBLE_REQUIRES_NON_FINAL_STATE =
  "STOP_BUBBLE_REQUIRES_NON_FINAL_STATE";
const STOP_BUBBLE_DEPENDENCY_MISSING = "STOP_BUBBLE_DEPENDENCY_MISSING";

function requireStopDependency<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw createStopBubbleError({
      reasonCode: STOP_BUBBLE_DEPENDENCY_MISSING,
      message: `stop requires dependency ${name}.`,
      context: {
        dependency: name,
        stage: "resolve_stop_dependencies"
      }
    });
  }
  return value;
}

export async function stopBubbleCommandOrchestration(
  input: StopBubbleInput,
  dependencies: StopBubbleDependencies = {}
): Promise<StopBubbleResult> {
  const resolveBubbleById = requireStopDependency(
    dependencies.resolveBubbleById,
    "resolveBubbleById"
  );
  const readStateSnapshot = requireStopDependency(
    dependencies.readStateSnapshot,
    "readStateSnapshot"
  );
  const executeStopCancellationMutation = requireStopDependency(
    dependencies.executeStopCancellationMutation,
    "executeStopCancellationMutation"
  );
  const terminateTmux = requireStopDependency(
    dependencies.terminateBubbleTmuxSession,
    "terminateBubbleTmuxSession"
  );
  const removeSession = requireStopDependency(
    dependencies.removeRuntimeSession,
    "removeRuntimeSession"
  );
  const writeState = requireStopDependency(
    dependencies.writeStateSnapshot,
    "writeStateSnapshot"
  );

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const loaded = await readStateSnapshot(resolved.bubblePaths.statePath);
  if (isFinalState(loaded.state.state)) {
    throw createStopBubbleError(
      `${STOP_BUBBLE_REQUIRES_NON_FINAL_STATE}: bubble stop requires non-final state (current: ${loaded.state.state}).`
    );
  }

  const tmux = await terminateTmux({
    bubbleId: resolved.bubbleId
  });
  const runtimeSessionRemoved = await removeSession({
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId
  });

  let written;
  try {
    written = await executeStopCancellationMutation({
      statePath: resolved.bubblePaths.statePath,
      loadedState: loaded,
      nowIso,
      writeStateSnapshot: writeState
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw createStopBubbleError(
      `Runtime cleanup completed (tmux session ${tmux.sessionName} terminated=${tmux.existed}, runtime session removed=${runtimeSessionRemoved}) but state transition to CANCELLED failed. Root error: ${reason}`
    );
  }

  return {
    bubbleId: resolved.bubbleId,
    state: written.state,
    tmuxSessionName: tmux.sessionName,
    tmuxSessionExisted: tmux.existed,
    runtimeSessionRemoved
  };
}

export type {
  StopBubbleDependencies,
  StopBubbleInput,
  StopBubbleResult
} from "./stopCommandContract.js";

export {
  StopBubbleError,
  throwAsStopBubbleError
};
