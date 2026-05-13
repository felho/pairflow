import { join } from "node:path";

import type { BubbleConfig } from "../config/bubbleConfigTypes.js";
import type { ReviewArtifactType } from "../config/bubbleConfigVocabulary.js";
import type {
  ProtocolEnvelope
} from "../protocol/protocolEnvelopeContract.js";

export const reviewerTestEvidenceSchemaVersion = 1 as const;

export type ReviewerTestEvidenceStatus = "trusted" | "untrusted";

export type ReviewerTestDecision = "skip_full_rerun" | "run_checks";

export type ReviewerTestReasonCode =
  | "evidence_missing"
  | "evidence_unverifiable"
  | "evidence_stale"
  | "pass_validation_policy_missing"
  | "no_trigger";

export type ReviewerTestCommandStatus =
  | "verified"
  | "missing"
  | "unverifiable"
  | "failed";

export interface ReviewerTestCommandEvidence {
  command: string;
  required: boolean;
  source: "summary" | "ref" | "none";
  source_ref?: string;
  matched_text?: string;
  status: ReviewerTestCommandStatus;
  exit_code: 0 | 1 | null;
  explicit_exit_status: boolean;
  completion_marker: boolean;
}

export interface ReviewerTestEvidenceArtifact {
  schema_version: typeof reviewerTestEvidenceSchemaVersion;
  bubble_id: string;
  pass_envelope_id: string;
  pass_ts: string;
  round: number;
  verified_at: string;
  status: ReviewerTestEvidenceStatus;
  decision: ReviewerTestDecision;
  reason_code: ReviewerTestReasonCode;
  reason_detail: string;
  required_commands: string[];
  command_evidence: ReviewerTestCommandEvidence[];
  diagnostics?: ReviewerTestEvidenceDiagnostics;
  git: {
    commit_sha: string | null;
    status_hash: string | null;
    dirty: boolean | null;
  };
}

export interface ReviewerTestExecutionDirective {
  skip_full_rerun: boolean;
  reason_code: ReviewerTestReasonCode;
  reason_detail: string;
  verification_status: "trusted" | "untrusted" | "missing";
}

export interface VerifyImplementerTestEvidenceInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  envelope: ProtocolEnvelope;
  worktreePath: string;
  repoPath: string;
  now?: Date;
}

export interface ResolveReviewerTestExecutionDirectiveInput {
  artifactPath: string;
  workspacePath?: string;
  worktreePath?: string;
  reviewArtifactType?: ReviewArtifactType;
}

interface ReviewerTestEvidenceDiagnostics {
  source_policy: {
    allowed_ref_paths: string[];
    rejected_refs: {
      input_ref: string;
      reason:
        | "source_not_whitelisted"
        | "source_outside_repo_scope"
        | "source_protocol_not_allowed"
        | "source_canonicalization_failed"
        | "source_duplicate_ref";
    }[];
    mode_marker?: "source_policy_fallback";
    fallback_context?: string;
  };
}

export function resolveReviewerTestEvidenceArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "reviewer-test-verification.json");
}

export function buildReviewerDecisionMatrixReminder(): string {
  return [
    "Decision matrix triggers that still require tests:",
    "evidence missing/unverifiable/stale,",
    "reviewer-requested scope changes,",
    "high-risk domains (concurrency/persistence/auth/security/destructive flows),",
    "or flaky/infra uncertainty."
  ].join(" ");
}

export function formatReviewerTestExecutionDirective(
  directive: ReviewerTestExecutionDirective
): string {
  if (directive.skip_full_rerun) {
    return [
      "Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies.",
      buildReviewerDecisionMatrixReminder(),
      `Reason: ${directive.reason_detail}`
    ].join(" ");
  }

  return [
    `Run required checks before final judgment (reason code: ${directive.reason_code}).`,
    `Reason: ${directive.reason_detail}`,
    buildReviewerDecisionMatrixReminder()
  ].join(" ");
}
