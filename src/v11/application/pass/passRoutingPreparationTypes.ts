import {
  type evaluateRepeatCleanAutoconvergeTrigger,
  type RepeatCleanAutoconvergeTriggerResult
} from "../../../v11/domain/convergence/repeatCleanAutoconverge.js";
import type { ReviewVerificationInputResolution } from "../../../v11/shared/reviewer/reviewVerification.js";
import type { ReadTranscriptEnvelopesPort } from "../../ports/transcript.js";
import type {
  AgentName,
  AgentRole,
  BubbleConfig,
  BubbleReviewAutoReworkSeverity
} from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent, ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "../../domain/pass/reviewerFindingsClaim.js";

export interface PreparePassRoutingInput {
  senderRole: "implementer" | "reviewer";
  round: number;
  summary: string;
  inputIntent?: PassIntent;
  refs: string[];
  findings: Finding[];
  hasFindings: boolean;
  noFindings: boolean;
  findingsPayloadInvalid: boolean;
  reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity;
  bubbleConfig: Pick<
    BubbleConfig,
    "review_artifact_type" | "severity_gate_round" | "accuracy_critical"
  >;
  worktreePath: string;
  transcriptPath: string;
  reviewer: AgentName;
  implementer: AgentName;
  createError: PairflowCreateCommandError;
}

export interface PreparePassRoutingResult {
  intent: PassIntent;
  inferredIntent: boolean;
  reviewerVerification: ReviewVerificationInputResolution | undefined;
  transcript: ProtocolEnvelope[];
  repeatCleanTrigger: RepeatCleanAutoconvergeTriggerResult;
  reviewerFindingsClaim?: ReviewerFindingsClaim;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
}

export interface PreparePassRoutingDependencies {
  prepareReviewerPass: (input: {
    senderRole: "implementer" | "reviewer";
    round: number;
    noFindings: boolean;
    findings: Finding[];
    hasFindings: boolean;
    findingsPayloadInvalid: boolean;
    reviewArtifactType: BubbleConfig["review_artifact_type"];
    severityGateRound: number;
    reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity;
    summary: string;
    createError: PairflowCreateCommandError;
  }) => {
    inferredReviewerIntent?: PassIntent;
    reviewerFindingsClaim?: ReviewerFindingsClaim;
    reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
  };
  resolvePassIntent: (input: {
    senderRole: "implementer" | "reviewer";
    noFindings: boolean;
    hasFindings: boolean;
    inferredReviewerIntent?: PassIntent;
    createError: PairflowCreateCommandError;
    inputIntent?: PassIntent;
  }, dependencies?: {
    inferDefaultPassIntent?: (role: "implementer" | "reviewer") => PassIntent;
  }) => {
    intent: PassIntent;
    inferredIntent: boolean;
  };
  inferDefaultPassIntent?: (role: "implementer" | "reviewer") => PassIntent;
  prepareReviewerVerification: (input: {
    reviewArtifactType: BubbleConfig["review_artifact_type"];
    senderRole: "implementer" | "reviewer";
    summary: string;
    refs: string[];
    accuracyCritical: boolean;
    worktreePath: string;
    intent: PassIntent;
    hasFindings: boolean;
    createError: PairflowCreateCommandError;
  }, dependencies: {
    resolveReviewerVerification: (input: {
      accuracyCritical: boolean;
      senderRole: AgentRole;
      refs: string[];
      worktreePath: string;
      createError: PairflowCreateCommandError;
    }) => Promise<ReviewVerificationInputResolution | undefined>;
  }) => Promise<ReviewVerificationInputResolution | undefined>;
  resolveReviewerVerification: (input: {
    accuracyCritical: boolean;
    senderRole: AgentRole;
    refs: string[];
    worktreePath: string;
    createError: PairflowCreateCommandError;
  }) => Promise<ReviewVerificationInputResolution | undefined>;
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  evaluateRepeatCleanAutoconvergeTrigger?: typeof evaluateRepeatCleanAutoconvergeTrigger;
}

export type PassRoutingTranscriptReader = ReadTranscriptEnvelopesPort;
