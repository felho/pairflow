import type { resolveRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import type {
  persistPassValidationRecoveryMarker,
  PassValidationRecoveryMarkerPersistWarning
} from "../../../core/runtime/passValidationEvidence.js";
import type { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { isFinalState } from "../../domain/state/transitions.js";
import type {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  RuntimeSessionsRegistry
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";

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
  resolveRepoPath?: typeof resolveRepoPath;
  listBubbleIdSet?: ListBubbleIdSet;
  readRuntimeSessionsRegistry?: typeof readRuntimeSessionsRegistry;
  removeRuntimeSessions?: typeof removeRuntimeSessions;
  persistPassValidationRecoveryMarker?: typeof persistPassValidationRecoveryMarker;
  readStateSnapshot?: typeof readStateSnapshot;
  isFinalState?: typeof isFinalState;
  countRegistryEntries?: (registry: RuntimeSessionsRegistry) => number;
}
