import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { persistPassValidationRecoveryMarker } from "../../infrastructure/artifact/validation/passValidationEvidence.js";
import { removeRuntimeSession } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { startBubble } from "../../../core/bubble/startBubble.js";
import type { RestartBubbleDependencies } from "../../application/restart/restartCommandContract.js";

export interface ResolvedRestartBubbleDependencies {
  resolveBubbleById: typeof resolveBubbleById;
  terminateBubbleTmuxSession: typeof terminateBubbleTmuxSession;
  removeRuntimeSession: typeof removeRuntimeSession;
  persistPassValidationRecoveryMarker: typeof persistPassValidationRecoveryMarker;
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
    persistPassValidationRecoveryMarker:
      dependencies.persistPassValidationRecoveryMarker
      ?? persistPassValidationRecoveryMarker,
    startBubble: dependencies.startBubble ?? startBubble
  };
}
