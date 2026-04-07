import { isFinalState } from "../../domain/state/transitions.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../core/state/stateStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import {
  removeRuntimeSession
} from "../../../core/runtime/sessionsRegistry.js";
import {
  terminateBubbleTmuxSession
} from "../../../core/runtime/tmuxManager.js";
import type {
  StopBubbleDependencies,
  StopBubbleInput,
  StopBubbleResult
} from "./stopCommandContract.js";
import { executeStopCancellationMutation } from "../../shared/stop/stopCancellationMutation.js";
import {
  StopBubbleError,
  createStopBubbleError,
  throwAsStopBubbleError
} from "./stopCommandRuntime.js";

const STOP_BUBBLE_REQUIRES_NON_FINAL_STATE =
  "STOP_BUBBLE_REQUIRES_NON_FINAL_STATE";

export async function stopBubbleCommandOrchestration(
  input: StopBubbleInput,
  dependencies: StopBubbleDependencies = {}
): Promise<StopBubbleResult> {
  const terminateTmux =
    dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession;
  const removeSession = dependencies.removeRuntimeSession ?? removeRuntimeSession;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;

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

export {
  StopBubbleError,
  throwAsStopBubbleError
};
