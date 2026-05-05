import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../shared/ports/passValidationRecovery.js";
import type { RemoveRuntimeSessionPort } from "../../shared/ports/runtimeSessions.js";
import type { TerminateBubbleTmuxSessionPort } from "../../shared/ports/tmuxSessions.js";
import type { BubbleRemotePointer } from "../../../types/bubble.js";
import type * as RestartBubbleDefaultsModuleExports from "../../defaults/restart/restartCommandDefaults.js";

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

type RestartBubbleDefaultsModule = typeof RestartBubbleDefaultsModuleExports;

function getRestartBubbleDefaultsModulePath(): string {
  return ["..", "..", "defaults", "restart", "restartCommandDefaults.js"].join("/");
}

export async function loadRestartBubbleDependencyDefaults(): Promise<RestartBubbleDefaultDependencies> {
  restartBubbleDependencyDefaultsPromise ??= import(
    getRestartBubbleDefaultsModulePath()
  ).then(({ restartBubbleDependencyDefaults }: RestartBubbleDefaultsModule) =>
    restartBubbleDependencyDefaults
  );
  return restartBubbleDependencyDefaultsPromise;
}
