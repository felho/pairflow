import type { RemoveRuntimeSessionPort } from "../../ports/runtimeSessions.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type { TerminateBubbleTmuxSessionPort } from "../../ports/tmuxSessions.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";

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
