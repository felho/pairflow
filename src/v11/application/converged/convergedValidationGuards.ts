import {
  summaryVerifierConsistencyGateSchemaVersion,
  type SummaryVerifierConsistencyGateDecisionRecord
} from "../../../v11/shared/reviewer/summaryVerifierConsistencyGate.js";
import type {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath
} from "../../../v11/shared/reviewer/summaryVerifierConsistencyGate.js";
import type {
  WriteSummaryVerifierConsistencyGateArtifactPort
} from "../../../v11/shared/ports/summaryVerifierGateArtifacts.js";
import type {
  ReadReviewVerificationArtifactStatusPort
} from "../../../v11/shared/ports/reviewVerificationArtifacts.js";
import type {
  resolveReviewerTestEvidenceArtifactPath
} from "../../../v11/shared/reviewer/testEvidence.js";
import type { ReviewerTestReasonCode } from "../../../v11/shared/reviewer/testEvidence.js";
import type { PrepareConvergedValidationInput } from "./convergedValidationPreparationContract.js";

type ReviewerDirectiveResolution = {
  skip_full_rerun: boolean;
  reason_code: ReviewerTestReasonCode;
  reason_detail: string;
  verification_status: "trusted" | "untrusted";
};

type ConvergedValidationBlockError = Error & {
  readonly convergedValidationBlock: true;
  readonly blockingInput: PairflowCommandErrorDetails;
};

function createConvergedValidationBlockError(
  createError: PairflowCreateCommandError,
  blockingInput: PairflowCommandErrorDetails
): ConvergedValidationBlockError {
  return Object.assign(createError(blockingInput), {
    convergedValidationBlock: true as const,
    blockingInput
  });
}

export function isConvergedValidationBlockError(
  error: unknown
): error is ConvergedValidationBlockError {
  return (
    error instanceof Error
    && "convergedValidationBlock" in error
    && error.convergedValidationBlock === true
    && "blockingInput" in error
  );
}

export async function assertAccuracyCriticalVerification(input: {
  validation: PrepareConvergedValidationInput;
  readVerificationArtifactStatus: ReadReviewVerificationArtifactStatusPort;
}): Promise<void> {
  if (input.validation.resolved.bubbleConfig.accuracy_critical === true) {
    const verification = await input.readVerificationArtifactStatus(
      input.validation.resolved.bubblePaths.reviewVerificationArtifactPath,
      {
        expectedRound: input.validation.state.round,
        expectedReviewer: input.validation.reviewer
      }
    );
    if (verification.status !== "pass") {
      throw createConvergedValidationBlockError(input.validation.createError, {
        reasonCode: "CONVERGED_ACCURACY_VERIFICATION_REQUIRED",
        message:
          `Convergence validation failed: accuracy-critical review verification must be pass (current: ${verification.status}).`,
        context: {
          command_name: "converged",
          bubble_id: input.validation.resolved.bubbleId,
          round: input.validation.state.round,
          gate_id: "converged_validation"
        }
      });
    }
  }
}

export async function evaluateAndPersistSummaryVerifierDecision(input: {
  validation: PrepareConvergedValidationInput;
  resolveReviewerDirective: (
    input: { artifactPath: string; worktreePath: string }
  ) => Promise<ReviewerDirectiveResolution>;
  resolveTestEvidenceArtifactPath: typeof resolveReviewerTestEvidenceArtifactPath;
  evaluateSummaryVerifierGate: typeof evaluateSummaryVerifierConsistencyGate;
  resolveSummaryVerifierArtifactPath: typeof resolveSummaryVerifierConsistencyGateArtifactPath;
  writeSummaryVerifierArtifact: WriteSummaryVerifierConsistencyGateArtifactPort;
}): Promise<SummaryVerifierConsistencyGateDecisionRecord> {
  const reviewerTestDirective = await input.resolveReviewerDirective({
    artifactPath:
      input.resolveTestEvidenceArtifactPath(input.validation.resolved.bubblePaths.artifactsDir),
    worktreePath: input.validation.resolved.bubblePaths.worktreePath
  }).catch(() => ({
    skip_full_rerun: false,
    reason_code: "evidence_unverifiable" as const,
    reason_detail:
      "Failed to resolve reviewer test directive due to verification runtime error.",
    verification_status: "untrusted" as const
  }));
  const summaryVerifierGateDecision = input.evaluateSummaryVerifierGate({
    summary: input.validation.summary,
    reviewArtifactType: input.validation.resolved.bubbleConfig.review_artifact_type,
    verifierStatus: reviewerTestDirective.verification_status,
    ...(reviewerTestDirective.verification_status === "trusted"
      ? {}
      : { verifierOriginReason: reviewerTestDirective.reason_code })
  });
  const summaryVerifierGateArtifactPath = input.resolveSummaryVerifierArtifactPath(
    input.validation.resolved.bubblePaths.artifactsDir
  );
  try {
    await input.writeSummaryVerifierArtifact(summaryVerifierGateArtifactPath, {
      schema_version: summaryVerifierConsistencyGateSchemaVersion,
      bubble_id: input.validation.resolved.bubbleId,
      round: input.validation.state.round,
      evaluated_at: input.validation.nowIso,
      ...summaryVerifierGateDecision
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw createConvergedValidationBlockError(input.validation.createError, {
      reasonCode: "CONVERGED_SUMMARY_VERIFIER_AUDIT_WRITE_FAILED",
      message:
        `Convergence validation failed: summary/verifier consistency gate audit write failed. Root error: ${reason}`,
      context: {
        command_name: "converged",
        bubble_id: input.validation.resolved.bubbleId,
        round: input.validation.state.round,
        gate_id: "converged_validation"
      }
    });
  }
  if (summaryVerifierGateDecision.gate_decision === "block") {
    throw createConvergedValidationBlockError(input.validation.createError, {
      reasonCode: "CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED",
      message:
        `Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary (reason_code=${summaryVerifierGateDecision.reason_code}, claim_classes_detected=${summaryVerifierGateDecision.claim_classes_detected}, verifier_status=${summaryVerifierGateDecision.verifier_status}, verifier_origin_reason=${summaryVerifierGateDecision.verifier_origin_reason ?? "unknown"}).`,
      context: {
        command_name: "converged",
        bubble_id: input.validation.resolved.bubbleId,
        round: input.validation.state.round,
        gate_id: "converged_validation"
      }
    });
  }

  return summaryVerifierGateDecision;
}
