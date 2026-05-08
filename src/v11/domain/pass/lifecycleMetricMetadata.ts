import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../v11/domain/convergence/repeatCleanAutoconverge.js";
import type { ReviewerTestExecutionDirective } from "../../../v11/shared/reviewer/testEvidence.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent } from "../../../contracts/kernel/protocol.js";
import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type { PassRecipientRole } from "./handoff.js";
import { buildFindingCounts } from "./findingCounts.js";
import { buildRepeatCleanLifecycleMetadata } from "./repeatCleanMetadata.js";

export interface ReviewerFindingsClaimMetricMetadata {
  state: string;
  source: string;
}

export interface ReviewerFindingsClaimParserMetricMetadata {
  parserState: string;
  parserDivergence: boolean;
}

export interface BuildPassLifecycleMetricMetadataInput {
  passIntent: PassIntent;
  inferredIntent: boolean;
  sender: AgentName;
  recipient: AgentName | "human";
  recipientRole: PassRecipientRole | "human";
  refsCount: number;
  hasFindings: boolean;
  noFindings: boolean;
  reviewerFindingsClaim?: ReviewerFindingsClaimMetricMetadata;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetricMetadata;
  transitionDecision: "normal_pass" | "auto_converge";
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  findings: Finding[];
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  passValidationCompatibilityArtifactWriteFailureReason?: string;
  docGateArtifactWriteFailureReason?: string;
}

export function buildPassLifecycleMetricMetadata(
  input: BuildPassLifecycleMetricMetadataInput
): Record<string, unknown> {
  return {
    pass_intent: input.passIntent,
    inferred_intent: input.inferredIntent,
    sender: input.sender,
    recipient: input.recipient,
    recipient_role: input.recipientRole,
    refs_count: input.refsCount,
    has_findings: input.hasFindings,
    no_findings: input.noFindings,
    ...(input.reviewerFindingsClaim !== undefined
      ? {
          findings_claim_state: input.reviewerFindingsClaim.state,
          findings_claim_source: input.reviewerFindingsClaim.source
        }
      : {}),
    ...(input.reviewerFindingsClaimParserMetadata !== undefined
      ? {
          findings_claim_parser_state:
            input.reviewerFindingsClaimParserMetadata.parserState,
          findings_claim_parser_divergence:
            input.reviewerFindingsClaimParserMetadata.parserDivergence
        }
      : {}),
    ...buildRepeatCleanLifecycleMetadata({
      transitionDecision: input.transitionDecision,
      reasonCode: input.repeatCleanReasonCode,
      reasonDetail: input.repeatCleanReasonDetail,
      trigger: input.repeatCleanTrigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        input.mostRecentPreviousReviewerCleanPassEnvelope
    }),
    ...(input.reviewerTestDirective !== undefined
      ? {
          reviewer_test_evidence_decision: input.reviewerTestDirective.skip_full_rerun
            ? "skip_full_rerun"
            : "run_checks",
          reviewer_test_evidence_reason_code: input.reviewerTestDirective.reason_code,
          reviewer_test_evidence_verification_status:
            input.reviewerTestDirective.verification_status
        }
      : {}),
    ...(input.passValidationCompatibilityArtifactWriteFailureReason !== undefined
      ? {
          pass_validation_reviewer_compat_artifact_write_failed: true,
          pass_validation_reviewer_compat_artifact_write_failure_reason:
            input.passValidationCompatibilityArtifactWriteFailureReason
        }
      : {}),
    ...buildFindingCounts(input.findings),
    ...(input.docGateArtifactWriteFailureReason !== undefined
      ? {
          doc_gate_artifact_write_failed: true,
          doc_gate_artifact_write_failure_reason:
            input.docGateArtifactWriteFailureReason
        }
      : {})
  };
}
