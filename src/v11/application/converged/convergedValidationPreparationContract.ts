import type {
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../../v11/shared/gates/docContractGates.js";
import type { readReviewVerificationArtifactStatus } from "../../../v11/shared/reviewer/reviewVerification.js";
import type {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath,
  writeSummaryVerifierConsistencyGateArtifact,
  SummaryVerifierConsistencyGateDecisionRecord
} from "../../../v11/shared/reviewer/summaryVerifierConsistencyGate.js";
import type {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../../../v11/shared/reviewer/testEvidence.js";
import type { ResolvedBubbleWorkspace } from "../../infrastructure/executor/workspace/workspaceResolution.js";
import type {
  AgentName,
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { GatePipelineOutcome } from "../gates/gatePipelineContract.js";

export interface PrepareConvergedValidationInput {
  resolved: ResolvedBubbleWorkspace;
  state: BubbleStateSnapshot;
  reviewer: AgentName;
  summary: string;
  nowIso: string;
  createError: PairflowCreateCommandError;
}

export interface PrepareConvergedValidationDependencies {
  isDocContractGateScopeActive?: typeof isDocContractGateScopeActive;
  readDocContractGateArtifact?: typeof readDocContractGateArtifact;
  resolveDocContractGateArtifactPath?: typeof resolveDocContractGateArtifactPath;
  readReviewVerificationArtifactStatus?: typeof readReviewVerificationArtifactStatus;
  resolveReviewerTestEvidenceArtifactPath?: typeof resolveReviewerTestEvidenceArtifactPath;
  resolveReviewerTestExecutionDirective?: typeof resolveReviewerTestExecutionDirective;
  evaluateSummaryVerifierConsistencyGate?: typeof evaluateSummaryVerifierConsistencyGate;
  resolveSummaryVerifierConsistencyGateArtifactPath?:
    typeof resolveSummaryVerifierConsistencyGateArtifactPath;
  writeSummaryVerifierConsistencyGateArtifact?: typeof writeSummaryVerifierConsistencyGateArtifact;
}

export interface PrepareConvergedValidationAllowedResult {
  outcome: Exclude<GatePipelineOutcome, "block">;
  diagnostics: string[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
  summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
}

export interface PrepareConvergedValidationBlockedResult {
  outcome: "block";
  diagnostics: string[];
  blockingError: PairflowCommandErrorDetails;
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
}

export type PrepareConvergedValidationResult =
  | PrepareConvergedValidationAllowedResult
  | PrepareConvergedValidationBlockedResult;
