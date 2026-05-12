import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { removeRuntimeSession } from "../runtimeSessions/runtimeSessionsDefaults.js";
import {
  readStateSnapshot as readStateSnapshotPersisted,
  writeStateSnapshot as writeStateSnapshotPersisted
} from "../../infrastructure/state/stateStore.js";
import {
  adaptPersistedReadPortToDomain,
  adaptPersistedWritePortToDomain
} from "../../shared/mutation/mutationBoundaryIO.js";
import { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { executeStopCancellationMutation } from "./stopCancellationMutation.js";

// Adapt persisted-shape infrastructure ports into domain-variant ports at
// the defaults boundary so the stop lane holds BubbleStateSnapshot
// end-to-end through its dependency contract.
const readStateSnapshot = adaptPersistedReadPortToDomain(readStateSnapshotPersisted);
const writeStateSnapshot = adaptPersistedWritePortToDomain(writeStateSnapshotPersisted);

export const stopBubbleDependencyDefaults = {
  executeStopCancellationMutation,
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
