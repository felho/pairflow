import { convergedDependencyDefaults } from "./convergedDependencyDefaults.js";
import {
  isDocContractGateScopeActive,
} from "../../shared/gates/docContractGates.js";
import type {
  ReadReviewVerificationArtifactStatusPort
} from "../../ports/reviewVerificationArtifacts.js";
import {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath
} from "../../shared/reviewer/summaryVerifierConsistencyGate.js";
import {
  resolveReviewerTestEvidenceArtifactPath
} from "../../shared/reviewer/testEvidence.js";
import type { ReviewerTestReasonCode } from "../../shared/reviewer/testEvidence.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../shared/gates/gateStateTypes.js";
import type {
  PrepareConvergedValidationDependencies,
  PrepareConvergedValidationInput,
  PrepareConvergedValidationResult
} from "./convergedValidationPreparationContract.js";
import {
  assertAccuracyCriticalVerification,
  evaluateAndPersistSummaryVerifierDecision,
  isConvergedValidationBlockError
} from "./convergedValidationGuards.js";

export type {
  PrepareConvergedValidationDependencies,
  PrepareConvergedValidationInput,
  PrepareConvergedValidationResult
} from "./convergedValidationPreparationContract.js";

type ResolvedReviewerDirective = {
  skip_full_rerun: boolean;
  reason_code: ReviewerTestReasonCode;
  reason_detail: string;
  verification_status: "trusted" | "untrusted";
};

interface ResolvedValidationDependencies {
  isDocGateScopeActive: typeof isDocContractGateScopeActive;
  readDocGateArtifact: typeof convergedDependencyDefaults.validation.readDocContractGateArtifact;
  resolveDocGateArtifactPath:
    typeof convergedDependencyDefaults.validation.resolveDocContractGateArtifactPath;
  readVerificationArtifactStatus: ReadReviewVerificationArtifactStatusPort;
  resolveTestEvidenceArtifactPath: typeof resolveReviewerTestEvidenceArtifactPath;
  resolveReviewerDirective: (
    input: { artifactPath: string; worktreePath: string }
  ) => Promise<ResolvedReviewerDirective>;
  evaluateSummaryVerifierGate: typeof evaluateSummaryVerifierConsistencyGate;
  resolveSummaryVerifierArtifactPath: typeof resolveSummaryVerifierConsistencyGateArtifactPath;
  writeSummaryVerifierArtifact:
    typeof convergedDependencyDefaults.validation.writeSummaryVerifierConsistencyGateArtifact;
}

function normalizeReviewerDirective(input: {
  skip_full_rerun: boolean;
  reason_code: ReviewerTestReasonCode;
  reason_detail: string;
  verification_status: "trusted" | "untrusted" | "missing";
}): ResolvedReviewerDirective {
  return {
    skip_full_rerun: input.skip_full_rerun,
    reason_code: input.reason_code,
    reason_detail: input.reason_detail,
    verification_status: input.verification_status === "trusted" ? "trusted" : "untrusted"
  };
}

function resolveValidationDependencies(
  dependencies: PrepareConvergedValidationDependencies
): ResolvedValidationDependencies {
  const resolveReviewerTestExecutionDirective =
    dependencies.resolveReviewerTestExecutionDirective
    ?? convergedDependencyDefaults.validation.resolveReviewerTestExecutionDirective;
  return {
    isDocGateScopeActive:
      dependencies.isDocContractGateScopeActive ?? isDocContractGateScopeActive,
    readDocGateArtifact:
      dependencies.readDocContractGateArtifact
      ?? convergedDependencyDefaults.validation.readDocContractGateArtifact,
    resolveDocGateArtifactPath:
      dependencies.resolveDocContractGateArtifactPath
      ?? convergedDependencyDefaults.validation.resolveDocContractGateArtifactPath,
    readVerificationArtifactStatus:
      dependencies.readReviewVerificationArtifactStatus
      ?? convergedDependencyDefaults.validation.readReviewVerificationArtifactStatus,
    resolveTestEvidenceArtifactPath:
      dependencies.resolveReviewerTestEvidenceArtifactPath
      ?? resolveReviewerTestEvidenceArtifactPath,
    resolveReviewerDirective: (async ({ artifactPath, worktreePath }) =>
      normalizeReviewerDirective(
        await resolveReviewerTestExecutionDirective({
          artifactPath,
          worktreePath
        })
      )) as ResolvedValidationDependencies["resolveReviewerDirective"],
    evaluateSummaryVerifierGate:
      dependencies.evaluateSummaryVerifierConsistencyGate
      ?? evaluateSummaryVerifierConsistencyGate,
    resolveSummaryVerifierArtifactPath:
      dependencies.resolveSummaryVerifierConsistencyGateArtifactPath
      ?? resolveSummaryVerifierConsistencyGateArtifactPath,
    writeSummaryVerifierArtifact:
      dependencies.writeSummaryVerifierConsistencyGateArtifact
      ?? convergedDependencyDefaults.validation.writeSummaryVerifierConsistencyGateArtifact
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
  let gateArtifact: Awaited<
    ReturnType<typeof convergedDependencyDefaults.validation.readDocContractGateArtifact>
  > | undefined;
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
  const diagnostics =
    docGateState.docGateArtifactReadFailureReason !== undefined
      ? [
          `Doc gate artifact read failed: ${docGateState.docGateArtifactReadFailureReason}`
        ]
      : [];

  try {
    await assertAccuracyCriticalVerification({
      validation: input,
      readVerificationArtifactStatus: resolvedDependencies.readVerificationArtifactStatus
    });
    const summaryVerifierGateDecision =
      await evaluateAndPersistSummaryVerifierDecision({
        validation: input,
        resolveReviewerDirective: resolvedDependencies.resolveReviewerDirective,
        resolveTestEvidenceArtifactPath: resolvedDependencies.resolveTestEvidenceArtifactPath,
        evaluateSummaryVerifierGate: resolvedDependencies.evaluateSummaryVerifierGate,
        resolveSummaryVerifierArtifactPath:
          resolvedDependencies.resolveSummaryVerifierArtifactPath,
        writeSummaryVerifierArtifact: resolvedDependencies.writeSummaryVerifierArtifact
      });

    return {
      outcome:
        docGateState.docGateArtifactReadFailureReason !== undefined ? "warn" : "pass",
      diagnostics,
      ...docGateState,
      summaryVerifierGateDecision
    };
  } catch (error) {
    if (!isConvergedValidationBlockError(error)) {
      throw error;
    }
    const blockingError = error.blockingInput;

    return {
      outcome: "block",
      diagnostics: [...diagnostics, blockingError.message],
      blockingError,
      ...docGateState
    };
  }
}
