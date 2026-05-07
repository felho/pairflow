import type { RemoveRuntimeSessionPort } from "../../shared/ports/runtimeSessions.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type { TerminateBubbleTmuxSessionPort } from "../../shared/ports/tmuxSessions.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";

export interface StopBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface StopBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
}

export type ExecuteStopCancellationMutationPort = (input: {
  statePath: string;
  loadedState: LoadedStateSnapshot;
  nowIso: string;
  writeStateSnapshot: WriteStateSnapshotPort;
}) => Promise<LoadedStateSnapshot>;

export interface StopBubbleDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  executeStopCancellationMutation?: ExecuteStopCancellationMutationPort;
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
}
