import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../shared/ports/passValidationRecovery.js";
import type { RemoveRuntimeSessionPort } from "../../shared/ports/runtimeSessions.js";
import type { TerminateBubbleTmuxSessionPort } from "../../shared/ports/tmuxSessions.js";
import type { RestartBubbleDependencies } from "./restartCommandContract.js";
import { startBubbleV11 as startBubble } from "../start/emitStartV11.js";
import { createRestartBubbleError } from "./restartCommandRuntime.js";

export interface ResolvedRestartBubbleDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort;
  startBubble: typeof startBubble;
}

function requireRestartDependency<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw createRestartBubbleError({
      reasonCode: "RESTART_DEPENDENCY_MISSING",
      message: `restart requires dependency ${name}.`,
      context: {
        dependency: name,
        stage: "resolve_restart_dependencies"
      }
    });
  }
  return value;
}

export function resolveRestartBubbleDependencies(
  dependencies: RestartBubbleDependencies = {}
): ResolvedRestartBubbleDependencies {
  return {
    resolveBubbleById: requireRestartDependency(
      dependencies.resolveBubbleById,
      "resolveBubbleById"
    ),
    terminateBubbleTmuxSession: requireRestartDependency(
      dependencies.terminateBubbleTmuxSession,
      "terminateBubbleTmuxSession"
    ),
    removeRuntimeSession: requireRestartDependency(
      dependencies.removeRuntimeSession,
      "removeRuntimeSession"
    ),
    persistPassValidationRecoveryMarker: requireRestartDependency(
      dependencies.persistPassValidationRecoveryMarker,
      "persistPassValidationRecoveryMarker"
    ),
    startBubble: dependencies.startBubble ?? startBubble
  };
}
