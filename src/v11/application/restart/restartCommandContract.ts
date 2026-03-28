import type { removeRuntimeSession } from "../../../core/runtime/sessionsRegistry.js";
import type {
  persistPassValidationRecoveryMarker,
  PassValidationRecoveryMarkerPersistWarning
} from "../../../core/runtime/passValidationEvidence.js";
import type { terminateBubbleTmuxSession } from "../../../core/runtime/tmuxManager.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type {
  startBubble,
  StartBubbleResult
} from "../../../core/bubble/startBubble.js";

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
