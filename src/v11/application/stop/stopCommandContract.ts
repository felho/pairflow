import type { RemoveRuntimeSessionPort } from "../../ports/runtimeSessions.js";
import type {
  LoadedDomainStateSnapshot,
  ReadDomainStateSnapshotPort,
  WriteDomainStateSnapshotPort
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
  loadedState: LoadedDomainStateSnapshot;
  nowIso: string;
  writeStateSnapshot: WriteDomainStateSnapshotPort;
}) => Promise<LoadedDomainStateSnapshot>;

export interface StopBubbleDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadDomainStateSnapshotPort;
  executeStopCancellationMutation?: ExecuteStopCancellationMutationPort;
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  writeStateSnapshot?: WriteDomainStateSnapshotPort;
}
