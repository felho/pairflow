import {
  summaryVerifierConsistencyGateSchemaVersion,
  type SummaryVerifierConsistencyGateDecisionRecord
} from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import type {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath,
  writeSummaryVerifierConsistencyGateArtifact
} from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import type { readReviewVerificationArtifactStatus } from "../../../core/reviewer/reviewVerification.js";
import type {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../../../core/reviewer/testEvidence.js";
import type { PrepareConvergedValidationInput } from "./convergedValidationPreparationContract.js";

export async function assertAccuracyCriticalVerification(input: {
  validation: PrepareConvergedValidationInput;
  readVerificationArtifactStatus: typeof readReviewVerificationArtifactStatus;
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
      // reason_code=CONVERGED_ACCURACY_VERIFICATION_REQUIRED round
      throw input.validation.createError(
        `Convergence validation failed: accuracy-critical review verification must be pass (current: ${verification.status}).`
      );
    }
  }
}

export async function evaluateAndPersistSummaryVerifierDecision(input: {
  validation: PrepareConvergedValidationInput;
  resolveReviewerDirective: typeof resolveReviewerTestExecutionDirective;
  resolveTestEvidenceArtifactPath: typeof resolveReviewerTestEvidenceArtifactPath;
  evaluateSummaryVerifierGate: typeof evaluateSummaryVerifierConsistencyGate;
  resolveSummaryVerifierArtifactPath: typeof resolveSummaryVerifierConsistencyGateArtifactPath;
  writeSummaryVerifierArtifact: typeof writeSummaryVerifierConsistencyGateArtifact;
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
    // reason_code=CONVERGED_SUMMARY_VERIFIER_AUDIT_WRITE_FAILED bubble_id round
    throw input.validation.createError(
      `Convergence validation failed: summary/verifier consistency gate audit write failed. Root error: ${reason}`
    );
  }
  if (summaryVerifierGateDecision.gate_decision === "block") {
    // reason_code=CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED bubble_id round
    throw input.validation.createError(
      `Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary (reason_code=${summaryVerifierGateDecision.reason_code}, claim_classes_detected=${summaryVerifierGateDecision.claim_classes_detected}, verifier_status=${summaryVerifierGateDecision.verifier_status}, verifier_origin_reason=${summaryVerifierGateDecision.verifier_origin_reason ?? "unknown"}).`
    );
  }

  return summaryVerifierGateDecision;
}
