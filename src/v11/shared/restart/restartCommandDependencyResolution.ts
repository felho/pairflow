import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { removeRuntimeSession } from "../../../core/runtime/sessionsRegistry.js";
import { terminateBubbleTmuxSession } from "../../../core/runtime/tmuxManager.js";
import { startBubble } from "../../../core/bubble/startBubble.js";
import type { RestartBubbleDependencies } from "../../application/restart/restartCommandContract.js";

export interface ResolvedRestartBubbleDependencies {
  resolveBubbleById: typeof resolveBubbleById;
  terminateBubbleTmuxSession: typeof terminateBubbleTmuxSession;
  removeRuntimeSession: typeof removeRuntimeSession;
  startBubble: typeof startBubble;
}

export function resolveRestartBubbleDependencies(
  dependencies: RestartBubbleDependencies = {}
): ResolvedRestartBubbleDependencies {
  return {
    resolveBubbleById: dependencies.resolveBubbleById ?? resolveBubbleById,
    terminateBubbleTmuxSession:
      dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession,
    removeRuntimeSession: dependencies.removeRuntimeSession ?? removeRuntimeSession,
    startBubble: dependencies.startBubble ?? startBubble
  };
}
