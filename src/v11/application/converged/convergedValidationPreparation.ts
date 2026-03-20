import {
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../../core/gates/docContractGates.js";
import { readReviewVerificationArtifactStatus } from "../../../core/reviewer/reviewVerification.js";
import {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath,
  summaryVerifierConsistencyGateSchemaVersion,
  writeSummaryVerifierConsistencyGateArtifact,
  type SummaryVerifierConsistencyGateDecisionRecord
} from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../../../core/reviewer/testEvidence.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type {
  PrepareConvergedValidationDependencies,
  PrepareConvergedValidationInput,
  PrepareConvergedValidationResult
} from "./convergedValidationPreparationContract.js";

export type {
  PrepareConvergedValidationDependencies,
  PrepareConvergedValidationInput,
  PrepareConvergedValidationResult
} from "./convergedValidationPreparationContract.js";

interface ResolvedValidationDependencies {
  isDocGateScopeActive: typeof isDocContractGateScopeActive;
  readDocGateArtifact: typeof readDocContractGateArtifact;
  resolveDocGateArtifactPath: typeof resolveDocContractGateArtifactPath;
  readVerificationArtifactStatus: typeof readReviewVerificationArtifactStatus;
  resolveTestEvidenceArtifactPath: typeof resolveReviewerTestEvidenceArtifactPath;
  resolveReviewerDirective: typeof resolveReviewerTestExecutionDirective;
  evaluateSummaryVerifierGate: typeof evaluateSummaryVerifierConsistencyGate;
  resolveSummaryVerifierArtifactPath: typeof resolveSummaryVerifierConsistencyGateArtifactPath;
  writeSummaryVerifierArtifact: typeof writeSummaryVerifierConsistencyGateArtifact;
}

function resolveValidationDependencies(
  dependencies: PrepareConvergedValidationDependencies
): ResolvedValidationDependencies {
  return {
    isDocGateScopeActive:
      dependencies.isDocContractGateScopeActive ?? isDocContractGateScopeActive,
    readDocGateArtifact:
      dependencies.readDocContractGateArtifact ?? readDocContractGateArtifact,
    resolveDocGateArtifactPath:
      dependencies.resolveDocContractGateArtifactPath ?? resolveDocContractGateArtifactPath,
    readVerificationArtifactStatus:
      dependencies.readReviewVerificationArtifactStatus ?? readReviewVerificationArtifactStatus,
    resolveTestEvidenceArtifactPath:
      dependencies.resolveReviewerTestEvidenceArtifactPath
      ?? resolveReviewerTestEvidenceArtifactPath,
    resolveReviewerDirective:
      dependencies.resolveReviewerTestExecutionDirective ?? resolveReviewerTestExecutionDirective,
    evaluateSummaryVerifierGate:
      dependencies.evaluateSummaryVerifierConsistencyGate
      ?? evaluateSummaryVerifierConsistencyGate,
    resolveSummaryVerifierArtifactPath:
      dependencies.resolveSummaryVerifierConsistencyGateArtifactPath
      ?? resolveSummaryVerifierConsistencyGateArtifactPath,
    writeSummaryVerifierArtifact:
      dependencies.writeSummaryVerifierConsistencyGateArtifact
      ?? writeSummaryVerifierConsistencyGateArtifact
  };
}

async function resolveDocGateValidationState(
  input: PrepareConvergedValidationInput,
  dependencies: Pick<
    ResolvedValidationDependencies,
    "isDocGateScopeActive" | "readDocGateArtifact" | "resolveDocGateArtifactPath"
  >
): Promise<Pick<
  PrepareConvergedValidationResult,
  "specLockState" | "roundGateState" | "docGateArtifactReadFailureReason"
>> {
  const docGateScopeActive = dependencies.isDocGateScopeActive({
    reviewArtifactType: input.resolved.bubbleConfig.review_artifact_type
  });
  const defaultSpecLockState: BubbleSpecLockState = {
    state: "IMPLEMENTABLE" as const,
    open_blocker_count: 0,
    open_required_now_count: 0
  };
  const defaultRoundGateState: BubbleRoundGateState = {
    applies: false,
    violated: false,
    round: input.state.round
  };
  let gateArtifact: Awaited<ReturnType<typeof readDocContractGateArtifact>> | undefined;
  let docGateArtifactReadFailureReason: string | undefined;
  if (docGateScopeActive) {
    try {
      gateArtifact = await dependencies.readDocGateArtifact(
        dependencies.resolveDocGateArtifactPath(input.resolved.bubblePaths.artifactsDir)
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      docGateArtifactReadFailureReason = reason;
      gateArtifact = undefined;
    }
  }
  const specLockState = docGateScopeActive
    ? gateArtifact?.spec_lock_state ?? defaultSpecLockState
    : defaultSpecLockState;
  const roundGateState = docGateScopeActive
    ? gateArtifact?.round_gate_state ?? defaultRoundGateState
    : defaultRoundGateState;

  return {
    specLockState,
    roundGateState,
    ...(docGateArtifactReadFailureReason !== undefined
      ? { docGateArtifactReadFailureReason }
      : {})
  };
}

async function assertAccuracyCriticalVerification(
  input: PrepareConvergedValidationInput,
  dependencies: Pick<ResolvedValidationDependencies, "readVerificationArtifactStatus">
): Promise<void> {
  if (input.resolved.bubbleConfig.accuracy_critical === true) {
    const verification = await dependencies.readVerificationArtifactStatus(
      input.resolved.bubblePaths.reviewVerificationArtifactPath,
      {
        expectedRound: input.state.round,
        expectedReviewer: input.reviewer
      }
    );
    if (verification.status !== "pass") {
      // reason_code=CONVERGED_ACCURACY_VERIFICATION_REQUIRED round
      throw input.createError(
        `Convergence validation failed: accuracy-critical review verification must be pass (current: ${verification.status}).`
      );
    }
  }
}

async function evaluateAndPersistSummaryVerifierDecision(
  input: PrepareConvergedValidationInput,
  dependencies: Pick<
    ResolvedValidationDependencies,
    | "resolveReviewerDirective"
    | "resolveTestEvidenceArtifactPath"
    | "evaluateSummaryVerifierGate"
    | "resolveSummaryVerifierArtifactPath"
    | "writeSummaryVerifierArtifact"
  >
): Promise<SummaryVerifierConsistencyGateDecisionRecord> {
  const reviewerTestDirective = await dependencies.resolveReviewerDirective({
    artifactPath:
      dependencies.resolveTestEvidenceArtifactPath(input.resolved.bubblePaths.artifactsDir),
    worktreePath: input.resolved.bubblePaths.worktreePath
  }).catch(() => ({
    skip_full_rerun: false,
    reason_code: "evidence_unverifiable" as const,
    reason_detail:
      "Failed to resolve reviewer test directive due to verification runtime error.",
    verification_status: "untrusted" as const
  }));
  const summaryVerifierGateDecision = dependencies.evaluateSummaryVerifierGate({
    summary: input.summary,
    reviewArtifactType: input.resolved.bubbleConfig.review_artifact_type,
    verifierStatus: reviewerTestDirective.verification_status,
    ...(reviewerTestDirective.verification_status === "trusted"
      ? {}
      : { verifierOriginReason: reviewerTestDirective.reason_code })
  });
  const summaryVerifierGateArtifactPath = dependencies.resolveSummaryVerifierArtifactPath(
    input.resolved.bubblePaths.artifactsDir
  );
  try {
    await dependencies.writeSummaryVerifierArtifact(summaryVerifierGateArtifactPath, {
      schema_version: summaryVerifierConsistencyGateSchemaVersion,
      bubble_id: input.resolved.bubbleId,
      round: input.state.round,
      evaluated_at: input.nowIso,
      ...summaryVerifierGateDecision
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // reason_code=CONVERGED_SUMMARY_VERIFIER_AUDIT_WRITE_FAILED bubble_id round
    throw input.createError(
      `Convergence validation failed: summary/verifier consistency gate audit write failed. Root error: ${reason}`
    );
  }
  if (summaryVerifierGateDecision.gate_decision === "block") {
    // reason_code=CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED bubble_id round
    throw input.createError(
      `Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary (reason_code=${summaryVerifierGateDecision.reason_code}, claim_classes_detected=${summaryVerifierGateDecision.claim_classes_detected}, verifier_status=${summaryVerifierGateDecision.verifier_status}, verifier_origin_reason=${summaryVerifierGateDecision.verifier_origin_reason ?? "unknown"}).`
    );
  }

  return summaryVerifierGateDecision;
}

export async function prepareConvergedValidation(
  input: PrepareConvergedValidationInput,
  dependencies: PrepareConvergedValidationDependencies = {}
): Promise<PrepareConvergedValidationResult> {
  const resolvedDependencies = resolveValidationDependencies(dependencies);
  const docGateState = await resolveDocGateValidationState(input, {
    isDocGateScopeActive: resolvedDependencies.isDocGateScopeActive,
    readDocGateArtifact: resolvedDependencies.readDocGateArtifact,
    resolveDocGateArtifactPath: resolvedDependencies.resolveDocGateArtifactPath
  });
  await assertAccuracyCriticalVerification(input, {
    readVerificationArtifactStatus: resolvedDependencies.readVerificationArtifactStatus
  });
  const summaryVerifierGateDecision =
    await evaluateAndPersistSummaryVerifierDecision(input, {
      resolveReviewerDirective: resolvedDependencies.resolveReviewerDirective,
      resolveTestEvidenceArtifactPath: resolvedDependencies.resolveTestEvidenceArtifactPath,
      evaluateSummaryVerifierGate: resolvedDependencies.evaluateSummaryVerifierGate,
      resolveSummaryVerifierArtifactPath: resolvedDependencies.resolveSummaryVerifierArtifactPath,
      writeSummaryVerifierArtifact: resolvedDependencies.writeSummaryVerifierArtifact
    });

  return {
    ...docGateState,
    summaryVerifierGateDecision
  };
}
