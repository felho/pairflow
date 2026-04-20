import type {
  PassValidationRecoveryMarkerPersistWarning,
  PersistPassValidationRecoveryMarkerPort
} from "../../shared/ports/passValidationRecovery.js";
import type {
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type {
  ResolveBubbleByIdPort
} from "../../shared/ports/bubbleLookup.js";
import type { BubbleRemotePointer } from "../../../types/bubble.js";
import type {
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type {
  startBubbleV11 as startBubble,
  StartBubbleV11Result as StartBubbleResult
} from "../start/emitStartV11.js";

export interface RestartBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface RestartBubbleResult {
  bubbleId: string;
  state: StartBubbleResult["state"];
  tmuxSessionName: string;
  worktreePath: string;
  previousTmuxSessionExisted: boolean;
  previousRuntimeSessionRemoved: boolean;
  warnings?: PassValidationRecoveryMarkerPersistWarning[] | undefined;
}

export interface RestartBubbleDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readRemotePointer?: (path: string) => Promise<BubbleRemotePointer | null>;
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  persistPassValidationRecoveryMarker?: PersistPassValidationRecoveryMarkerPort;
  startBubble?: typeof startBubble;
}
