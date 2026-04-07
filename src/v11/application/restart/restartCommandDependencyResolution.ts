import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../shared/ports/passValidationRecovery.js";
import type { RemoveRuntimeSessionPort } from "../../shared/ports/runtimeSessions.js";
import type { TerminateBubbleTmuxSessionPort } from "../../shared/ports/tmuxSessions.js";
import type { RestartBubbleDependencies } from "./restartCommandContract.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { persistPassValidationRecoveryMarker } from "../../../core/runtime/passValidationEvidence.js";
import { removeRuntimeSession } from "../../../core/runtime/sessionsRegistry.js";
import { terminateBubbleTmuxSession } from "../../../core/runtime/tmuxManager.js";
import { startBubbleV11 as startBubble } from "../start/emitStartV11.js";

export interface ResolvedRestartBubbleDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort;
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
