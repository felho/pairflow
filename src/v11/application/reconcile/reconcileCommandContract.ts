import type {
  PassValidationRecoveryMarkerPersistWarning,
  PersistPassValidationRecoveryMarkerPort
} from "../../shared/ports/passValidationRecovery.js";
import type { ResolveRepoPathPort } from "../../shared/ports/repoResolution.js";
import type { ReadStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
import type { isFinalState } from "../../domain/state/transitions.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  RemoveRuntimeSessionsPort,
  RuntimeSessionsRegistry
} from "../../shared/ports/runtimeSessions.js";

export type RuntimeSessionStaleReason =
  | "missing_bubble"
  | "final_state"
  | "non_runtime_state"
  | "missing_tmux_session"
  | "invalid_state";

export type TmuxSessionLivenessProbe = (sessionName: string) => Promise<boolean>;

export interface ReconcileRuntimeSessionsInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
  dryRun?: boolean | undefined;
  isTmuxSessionAlive?: TmuxSessionLivenessProbe | undefined;
}

export interface ReconcileRuntimeSessionsAction {
  bubbleId: string;
  reason: RuntimeSessionStaleReason;
  removed: boolean;
  removalBlockedByRecoveryMarker?: boolean | undefined;
}

export interface ReconcileRuntimeSessionsReport {
  repoPath: string;
  dryRun: boolean;
  sessionsBefore: number;
  sessionsAfter: number;
  staleCandidates: number;
  reasonCounts: Partial<Record<RuntimeSessionStaleReason, number>>;
  actions: ReconcileRuntimeSessionsAction[];
  warnings?: PassValidationRecoveryMarkerPersistWarning[] | undefined;
}

export type ListBubbleIdSet = (repoPath: string) => Promise<Set<string>>;

export interface ReconcileRuntimeSessionsDependencies {
  resolveRepoPath?: ResolveRepoPathPort;
  listBubbleIdSet?: ListBubbleIdSet;
  readRuntimeSessionsRegistry?: ReadRuntimeSessionsRegistryPort;
  removeRuntimeSessions?: RemoveRuntimeSessionsPort;
  persistPassValidationRecoveryMarker?: PersistPassValidationRecoveryMarkerPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  isFinalState?: typeof isFinalState;
  countRegistryEntries?: (registry: RuntimeSessionsRegistry) => number;
}
