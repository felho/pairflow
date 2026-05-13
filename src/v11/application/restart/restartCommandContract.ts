import type {
  PassValidationRecoveryMarkerPersistWarning,
  PersistPassValidationRecoveryMarkerPort
} from "../../ports/passValidationRecovery.js";
import type {
  RemoveRuntimeSessionPort
} from "../../ports/runtimeSessions.js";
import type {
  ResolveBubbleByIdPort
} from "../../ports/bubbleLookup.js";
import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type {
  TerminateBubbleTmuxSessionPort
} from "../../ports/tmuxSessions.js";
import type {
  StartBubbleInput,
  StartBubbleResult
} from "../start/startCommandContract.js";

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

export type RestartStartBubblePort = (
  input: StartBubbleInput
) => Promise<StartBubbleResult>;

export interface RestartBubbleDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readRemotePointer?: (path: string) => Promise<BubbleRemotePointer | null>;
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  persistPassValidationRecoveryMarker?: PersistPassValidationRecoveryMarkerPort;
  startBubble?: RestartStartBubblePort;
}
