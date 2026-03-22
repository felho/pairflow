import type {
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../../core/gates/docContractGates.js";
import type { readReviewVerificationArtifactStatus } from "../../../core/reviewer/reviewVerification.js";
import type {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath,
  writeSummaryVerifierConsistencyGateArtifact,
  SummaryVerifierConsistencyGateDecisionRecord
} from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import type {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../../../core/reviewer/testEvidence.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type {
  AgentName,
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";

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

export interface PrepareConvergedValidationResult {
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
  summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
}
