import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../shared/ports/passValidationRecovery.js";
import type { RemoveRuntimeSessionPort } from "../../shared/ports/runtimeSessions.js";
import type { TerminateBubbleTmuxSessionPort } from "../../shared/ports/tmuxSessions.js";

export interface RestartBubbleDefaultDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort;
}

let restartBubbleDependencyDefaultsPromise:
  | Promise<RestartBubbleDefaultDependencies>
  | undefined;

export async function loadRestartBubbleDependencyDefaults(): Promise<RestartBubbleDefaultDependencies> {
  restartBubbleDependencyDefaultsPromise ??= import(
    "../../../core/bubble/restartBubbleDefaults.js"
  ).then(({ restartBubbleDependencyDefaults }) => restartBubbleDependencyDefaults);
  return restartBubbleDependencyDefaultsPromise;
}
