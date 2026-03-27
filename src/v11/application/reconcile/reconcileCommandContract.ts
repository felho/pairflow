import type { resolveRepoPath } from "../../../core/bubble/repoResolution.js";
import type { readStateSnapshot } from "../../../core/state/stateStore.js";
import type { isFinalState } from "../../../core/state/transitions.js";
import type {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  RuntimeSessionsRegistry
} from "../../../core/runtime/sessionsRegistry.js";

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
}

export interface ReconcileRuntimeSessionsReport {
  repoPath: string;
  dryRun: boolean;
  sessionsBefore: number;
  sessionsAfter: number;
  staleCandidates: number;
  reasonCounts: Partial<Record<RuntimeSessionStaleReason, number>>;
  actions: ReconcileRuntimeSessionsAction[];
}

export type ListBubbleIdSet = (repoPath: string) => Promise<Set<string>>;

export interface ReconcileRuntimeSessionsDependencies {
  resolveRepoPath?: typeof resolveRepoPath;
  listBubbleIdSet?: ListBubbleIdSet;
  readRuntimeSessionsRegistry?: typeof readRuntimeSessionsRegistry;
  removeRuntimeSessions?: typeof removeRuntimeSessions;
  readStateSnapshot?: typeof readStateSnapshot;
  isFinalState?: typeof isFinalState;
  countRegistryEntries?: (registry: RuntimeSessionsRegistry) => number;
}
