import type { removeRuntimeSession } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  persistPassValidationRecoveryMarker,
  PassValidationRecoveryMarkerPersistWarning
} from "../../infrastructure/artifact/validation/passValidationEvidence.js";
import type { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import type { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
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
  resolveBubbleById?: typeof resolveBubbleById;
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
  persistPassValidationRecoveryMarker?: typeof persistPassValidationRecoveryMarker;
  startBubble?: typeof startBubble;
}
