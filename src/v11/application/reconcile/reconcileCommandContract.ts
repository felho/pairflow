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
  actions: ReconcileRuntimeSessionsAction[];
}
