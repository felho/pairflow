export const passValidationRecoveryMarkerSchemaVersion = 1 as const

export type PassValidationRecoverySource = "restart" | "reconcile"

export interface PassValidationRecoveryMarker {
  schema_version: typeof passValidationRecoveryMarkerSchemaVersion
  bubble_id: string
  flow: PassValidationRecoverySource
  occurred_at: string
  repo_path: string
  worktree_path?: string
}

export type ReadPassValidationRecoveryMarkerResult =
  | {
      state: "missing"
    }
  | {
      state: "valid"
      marker: PassValidationRecoveryMarker
      marker_path: string
      marker_scope: "repo" | "worktree"
    }
  | {
      state: "recovery_uncertain"
      reason_code: "pass_validation_evidence_recovery_uncertain"
      detail: string
      marker_path: string
      marker_scope: "repo" | "worktree"
    }

export type RecoveryUncertainResult = Extract<
  ReadPassValidationRecoveryMarkerResult,
  { state: "recovery_uncertain" }
>
