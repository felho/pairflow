export type PassValidationRecoverySource = "restart" | "reconcile";

export interface PassValidationRecoveryMarkerPersistWarningMetadata {
  flow: PassValidationRecoverySource;
  marker_scope: "repo" | "worktree";
  target_path_kind: "repo_runtime_marker" | "worktree_marker";
  target_path_exists: boolean;
  error_code?: string;
  failed_targets: string[];
  persisted_targets: string[];
  repo_marker_path: string;
  worktree_marker_path?: string;
  worktreePathRequested: boolean;
}

export interface PassValidationRecoveryMarkerPersistWarning {
  reason_code: "pass_validation_recovery_marker_persist_failed";
  message: string;
  metadata: PassValidationRecoveryMarkerPersistWarningMetadata;
}

export interface PersistPassValidationRecoveryMarkerResult {
  persisted_targets: string[];
  warnings: PassValidationRecoveryMarkerPersistWarning[];
}

export interface PersistPassValidationRecoveryMarkerInput {
  repoPath: string;
  bubbleId: string;
  flow: PassValidationRecoverySource;
  now?: Date;
  worktreePath?: string;
}

export type PersistPassValidationRecoveryMarkerPort = (
  input: PersistPassValidationRecoveryMarkerInput
) => Promise<PersistPassValidationRecoveryMarkerResult>;
