import {
  isDocContractGateScopeActive,
} from "../../../v11/shared/gates/docContractGates.js";
import type {
  ReadReviewVerificationArtifactStatusPort
} from "../../../v11/shared/ports/reviewVerificationArtifacts.js";
import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../../core/gates/docContractGateArtifacts.js";
import {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath
} from "../../../v11/shared/reviewer/summaryVerifierConsistencyGate.js";
import {
  writeSummaryVerifierConsistencyGateArtifact
} from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import { readReviewVerificationArtifactStatus } from "../../../core/reviewer/reviewVerificationArtifacts.js";
import {
  resolveReviewerTestEvidenceArtifactPath
} from "../../../v11/shared/reviewer/testEvidence.js";
import type { ReviewerTestReasonCode } from "../../../v11/shared/reviewer/testEvidence.js";
import {
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
  readDocGateArtifact: typeof readDocContractGateArtifact;
  resolveDocGateArtifactPath: typeof resolveDocContractGateArtifactPath;
  readVerificationArtifactStatus: ReadReviewVerificationArtifactStatusPort;
  resolveTestEvidenceArtifactPath: typeof resolveReviewerTestEvidenceArtifactPath;
  resolveReviewerDirective: (
    input: { artifactPath: string; worktreePath: string }
  ) => Promise<ResolvedReviewerDirective>;
  evaluateSummaryVerifierGate: typeof evaluateSummaryVerifierConsistencyGate;
  resolveSummaryVerifierArtifactPath: typeof resolveSummaryVerifierConsistencyGateArtifactPath;
  writeSummaryVerifierArtifact: typeof writeSummaryVerifierConsistencyGateArtifact;
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
      (async ({ artifactPath, worktreePath }) =>
        normalizeReviewerDirective(
          await (dependencies.resolveReviewerTestExecutionDirective
            ?? resolveReviewerTestExecutionDirective)({
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
