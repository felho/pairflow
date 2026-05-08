import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../v11/domain/convergence/repeatCleanAutoconverge.js";
import type { ReviewVerificationInputResolution } from "../../../v11/shared/reviewer/reviewVerification.js";
import type {
  AgentName
} from "../../domain/agentIdentity/agentIdentity.js";
import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent, ProtocolEnvelope } from "../../../types/protocol.js";
import type { EmitConvergedV11Result as EmitConvergedResult } from "../converged/emitConvergedV11.js";
import type { ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "../../domain/pass/reviewerFindingsClaim.js";
import type { PassActivationProvenance } from "./passCommandContract.js";

export interface RunAutoConvergeFlowInput {
  summary: string;
  refs: string[];
  now: Date;
  nowIso: string;
  bubbleId: string;
  bubbleInstanceId: string;
  repoPath: string;
  bubbleConfig: BubbleConfig;
  worktreePath: string;
  artifactsDir: string;
  taskArtifactPath: string;
  statePath: string;
  reviewVerificationArtifactPath: string;
  handoff: Pick<
    ResolvedPassHandoff,
    "senderRole" | "senderAgent" | "envelopeRound"
  >;
  reviewer: AgentName;
  implementer: AgentName;
  roundRoleHistory: BubbleStateSnapshot["round_role_history"];
  transcript: ProtocolEnvelope[];
  severityGateRound: number;
  expectedStateFingerprint: string;
  reviewerVerification: ReviewVerificationInputResolution | undefined;
  passIntent: PassIntent;
  inferredIntent: boolean;
  activation?: PassActivationProvenance;
  hasFindings: boolean;
  noFindings: boolean;
  findings: Finding[];
  reviewerFindingsClaim?: ReviewerFindingsClaim;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  createError: PairflowCreateCommandError;
  onDownstreamRejected: (reason: string) => never;
}

export interface RunAutoConvergeFlowDependencies<TResult> {
  prepareRepeatCleanAutoConverge: (input: {
    round: number;
    reviewer: AgentName;
    implementer: AgentName;
    reviewArtifactType: BubbleConfig["review_artifact_type"];
    roundRoleHistory: BubbleStateSnapshot["round_role_history"];
    transcript: ProtocolEnvelope[];
    severityGateRound: number;
    statePath: string;
    expectedStateFingerprint: string;
    reviewerVerification: ReviewVerificationInputResolution | undefined;
    reviewVerificationArtifactPath: string;
    bubbleId: string;
    reviewerAgent: AgentName;
    generatedAt: string;
    createError: PairflowCreateCommandError;
  }) => Promise<{
    expectedStateFingerprint: string;
  }>;
  executeAutoConvergeConverged: (input: {
    summary: string;
    refs: string[];
    cwd: string;
    now: Date;
    expectedStateFingerprint: string;
    expectedRound: number;
    expectedReviewer: AgentName;
    onDownstreamRejected: (reason: string) => never;
  }) => Promise<EmitConvergedResult>;
  finalizeAutoConvergePass: (input: {
    now: Date;
    bubbleConfig: BubbleConfig;
    artifactsDir: string;
    taskArtifactPath: string;
    round: number;
    senderRole: "implementer" | "reviewer";
    findings: Finding[];
    createError: PairflowCreateCommandError;
    repoPath: string;
    bubbleId: string;
    bubbleInstanceId: string;
    passIntent: PassIntent;
    inferredIntent: boolean;
    senderAgent: AgentName;
    refsCount: number;
    hasFindings: boolean;
    noFindings: boolean;
    reviewerFindingsClaim?: ReviewerFindingsClaim;
    reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
    repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
    repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
    repeatCleanTrigger: boolean;
    mostRecentPreviousReviewerCleanPassEnvelope: boolean;
    activation?: PassActivationProvenance;
    converged: EmitConvergedResult;
  }) => Promise<TResult>;
}

export async function runAutoConvergeFlow<TResult>(
  input: RunAutoConvergeFlowInput,
  dependencies: RunAutoConvergeFlowDependencies<TResult>
): Promise<TResult> {
  const autoConvergePreparation = await dependencies.prepareRepeatCleanAutoConverge({
    round: input.handoff.envelopeRound,
    reviewer: input.reviewer,
    implementer: input.implementer,
    reviewArtifactType: input.bubbleConfig.review_artifact_type,
    roundRoleHistory: input.roundRoleHistory,
    transcript: input.transcript,
    severityGateRound: input.severityGateRound,
    statePath: input.statePath,
    expectedStateFingerprint: input.expectedStateFingerprint,
    reviewerVerification: input.reviewerVerification,
    reviewVerificationArtifactPath: input.reviewVerificationArtifactPath,
    bubbleId: input.bubbleId,
    reviewerAgent: input.handoff.senderAgent,
    generatedAt: input.nowIso,
    createError: input.createError
  });

  const converged = await dependencies.executeAutoConvergeConverged({
    summary: input.summary,
    refs: input.refs,
    cwd: input.worktreePath,
    now: input.now,
    expectedStateFingerprint: autoConvergePreparation.expectedStateFingerprint,
    expectedRound: input.handoff.envelopeRound,
    expectedReviewer: input.reviewer,
    onDownstreamRejected: input.onDownstreamRejected
  });

  return dependencies.finalizeAutoConvergePass({
    now: input.now,
    bubbleConfig: input.bubbleConfig,
    artifactsDir: input.artifactsDir,
    taskArtifactPath: input.taskArtifactPath,
    round: input.handoff.envelopeRound,
    senderRole: input.handoff.senderRole,
    findings: input.findings,
    createError: input.createError,
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    passIntent: input.passIntent,
    inferredIntent: input.inferredIntent,
    senderAgent: input.handoff.senderAgent,
    refsCount: input.refs.length,
    hasFindings: input.hasFindings,
    noFindings: input.noFindings,
    ...(input.reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim: input.reviewerFindingsClaim }
      : {}),
    ...(input.reviewerFindingsClaimParserMetadata !== undefined
      ? { reviewerFindingsClaimParserMetadata: input.reviewerFindingsClaimParserMetadata }
      : {}),
    repeatCleanReasonCode: input.repeatCleanReasonCode,
    repeatCleanReasonDetail: input.repeatCleanReasonDetail,
    repeatCleanTrigger: input.repeatCleanTrigger,
    mostRecentPreviousReviewerCleanPassEnvelope:
      input.mostRecentPreviousReviewerCleanPassEnvelope,
    ...(input.activation !== undefined
      ? { activation: input.activation }
      : {}),
    converged
  });
}
