import type {
  isDocContractGateScopeActive
} from "../../../../shared/gates/docContractGates.js";
import type {
  ReadReviewVerificationArtifactStatusPort
} from "../../../../ports/reviewVerificationArtifacts.js";
import type {
  ReadDocContractGateArtifactPort,
  ResolveDocContractGateArtifactPathPort
} from "../../../../ports/docContractGateArtifacts.js";
import type {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath,
  SummaryVerifierConsistencyGateDecisionRecord
} from "../../../../shared/reviewer/summaryVerifierConsistencyGate.js";
import type {
  WriteSummaryVerifierConsistencyGateArtifactPort
} from "../../../../ports/summaryVerifierGateArtifacts.js";
import type { resolveReviewerTestEvidenceArtifactPath } from "../../../../shared/reviewer/testEvidence.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../../../ports/reviewerTestEvidenceArtifacts.js";
import type { ResolvedBubbleWorkspace } from "../../../../ports/workspaceResolution.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../../shared/gates/gateStateTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { GatePipelineOutcome } from "../../../gates/gatePipelineContract.js";

export interface PrepareConvergedValidationInput {
  resolved: ResolvedBubbleWorkspace;
  state: PersistedBubbleStateSnapshot;
  reviewer: AgentName;
  summary: string;
  nowIso: string;
  createError: PairflowCreateCommandError;
}

export interface PrepareConvergedValidationDependencies {
  isDocContractGateScopeActive?: typeof isDocContractGateScopeActive;
  readDocContractGateArtifact?: ReadDocContractGateArtifactPort;
  resolveDocContractGateArtifactPath?: ResolveDocContractGateArtifactPathPort;
  readReviewVerificationArtifactStatus?: ReadReviewVerificationArtifactStatusPort;
  resolveReviewerTestEvidenceArtifactPath?: typeof resolveReviewerTestEvidenceArtifactPath;
  resolveReviewerTestExecutionDirective?: ResolveReviewerTestExecutionDirectivePort;
  evaluateSummaryVerifierConsistencyGate?: typeof evaluateSummaryVerifierConsistencyGate;
  resolveSummaryVerifierConsistencyGateArtifactPath?:
    typeof resolveSummaryVerifierConsistencyGateArtifactPath;
  writeSummaryVerifierConsistencyGateArtifact?:
    WriteSummaryVerifierConsistencyGateArtifactPort;
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
