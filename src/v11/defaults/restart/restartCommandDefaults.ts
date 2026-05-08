import {
  restartBubbleDependencyDefaults as restartBubbleDefaultsCanonical
} from "../../infrastructure/executor/restart/restartCommandDefaults.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../ports/passValidationRecovery.js";
import type { RemoveRuntimeSessionPort } from "../../ports/runtimeSessions.js";
import type { TerminateBubbleTmuxSessionPort } from "../../ports/tmuxSessions.js";
import type { BubbleRemotePointer } from "../../../types/bubble.js";

interface RestartBubbleDefaultDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort;
}

export const restartBubbleDependencyDefaults: RestartBubbleDefaultDependencies =
  restartBubbleDefaultsCanonical;
