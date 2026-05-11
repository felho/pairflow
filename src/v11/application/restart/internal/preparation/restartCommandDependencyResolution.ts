import type { ResolveBubbleByIdPort } from "../../../../ports/bubbleLookup.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../../../ports/passValidationRecovery.js";
import type { RemoveRuntimeSessionPort } from "../../../../ports/runtimeSessions.js";
import type { TerminateBubbleTmuxSessionPort } from "../../../../ports/tmuxSessions.js";
import type {
  BubbleRemotePointer
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type { RestartBubbleDependencies } from "../../restartCommandContract.js";
import { startBubble } from "../../../start/startCommandApi.js";
import { createRestartBubbleError } from "../error/restartCommandRuntime.js";

export interface ResolvedRestartBubbleDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
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
    readRemotePointer: requireRestartDependency(
      dependencies.readRemotePointer,
      "readRemotePointer"
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
