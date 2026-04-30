import type { ReviewerTestExecutionDirective } from "../../../../v11/shared/reviewer/testEvidence.js"
import type { ValidationCommandId } from "../../../shared/validation/validationCommandId.js"

export const passValidationEvidenceSchemaVersion = 1 as const

export type PassValidationCommandId = ValidationCommandId

export type PassValidationPolicyState =
  | "policy_missing"
  | "policy_configured"
  | "policy_explicit_null"

export interface PassValidationCommandSpec {
  kind: PassValidationCommandId
  command: string
}

export interface PassValidationCommandResult {
  kind: PassValidationCommandId
  command: string
  exitCode: number
  logPath: string
  durationMs: number
}

export interface PassValidationEvidenceArtifact {
  schema_version: typeof passValidationEvidenceSchemaVersion
  bubble_id: string
  round: number
  generated_at: string
  head_sha: string | null
  git_status_hash: string | null
  policy_state: PassValidationPolicyState
  commands: Array<{
    kind: PassValidationCommandId
    command: string
    exit_code?: number
    log_path?: string
    duration_ms?: number
  }>
  required_command_set_id: string | null
  trust_level: "trusted" | "untrusted"
  trust_reason_code: "no_trigger" | "pass_validation_policy_missing"
}

export interface PassValidationReviewerCompatibilityArtifact {
  verification_status: ReviewerTestExecutionDirective["verification_status"]
  skip_full_rerun: boolean
  reason_code: ReviewerTestExecutionDirective["reason_code"]
  reason_detail: string
  status: "trusted" | "untrusted" | "missing"
  decision: "skip_full_rerun" | "run_checks"
}

export interface PassValidationReuseDecision {
  reusable: boolean
  reason_code?: "pass_validation_evidence_mismatch" | "pass_validation_evidence_recovery_uncertain"
  detail: string
  metadata: {
    recovery_marker_state: "missing" | "valid" | "recovery_uncertain"
    required_command_set_id: string | null
  }
}
