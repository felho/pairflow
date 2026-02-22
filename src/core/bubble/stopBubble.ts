import { applyStateTransition } from "../state/machine.js";
import { isFinalState } from "../state/transitions.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
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
import type { BubbleStateSnapshot } from "../../types/bubble.js";

export interface StopBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface StopBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
}

export interface StopBubbleDependencies {
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
}

export class StopBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StopBubbleError";
  }
}

export async function stopBubble(
  input: StopBubbleInput,
  dependencies: StopBubbleDependencies = {}
): Promise<StopBubbleResult> {
  const terminateTmux =
    dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession;
  const removeSession = dependencies.removeRuntimeSession ?? removeRuntimeSession;

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const loaded = await readStateSnapshot(resolved.bubblePaths.statePath);
  if (isFinalState(loaded.state.state)) {
    throw new StopBubbleError(
      `bubble stop requires non-final state (current: ${loaded.state.state}).`
    );
  }

  const tmux = await terminateTmux({
    bubbleId: resolved.bubbleId
  });
  const runtimeSessionRemoved = await removeSession({
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId
  });

  const cancelled = applyStateTransition(loaded.state, {
    to: "CANCELLED",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: nowIso
  });

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, cancelled, {
      expectedFingerprint: loaded.fingerprint
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new StopBubbleError(
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

export function asStopBubbleError(error: unknown): never {
  if (error instanceof StopBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new StopBubbleError(error.message);
  }
  if (error instanceof TmuxCommandError) {
    throw new StopBubbleError(error.message);
  }
  if (
    error instanceof RuntimeSessionsRegistryError ||
    error instanceof RuntimeSessionsRegistryLockError
  ) {
    throw new StopBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw new StopBubbleError(error.message);
  }
  throw error;
}
