import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../shared/ports/passValidationRecovery.js";
import type { RemoveRuntimeSessionPort } from "../../shared/ports/runtimeSessions.js";
import type { TerminateBubbleTmuxSessionPort } from "../../shared/ports/tmuxSessions.js";
import type { BubbleRemotePointer } from "../../../types/bubble.js";

export interface RestartBubbleDefaultDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort;
}

let restartBubbleDependencyDefaultsPromise:
  | Promise<RestartBubbleDefaultDependencies>
  | undefined;

export async function loadRestartBubbleDependencyDefaults(): Promise<RestartBubbleDefaultDependencies> {
  restartBubbleDependencyDefaultsPromise ??= import(
    "../../defaults/restart/restartCommandDefaults.js"
  ).then(({ restartBubbleDependencyDefaults }) => restartBubbleDependencyDefaults);
  return restartBubbleDependencyDefaultsPromise;
}
