import {
  evaluateRepeatCleanAutoconvergeTrigger,
  type RepeatCleanAutoconvergeTriggerResult
} from "../../../core/convergence/repeatCleanAutoconverge.js";
import {
  readTranscriptEnvelopes,
  type ReadTranscriptOptions
} from "../../../core/protocol/transcriptStore.js";
import type { ReviewVerificationInputResolution } from "../../../core/reviewer/reviewVerification.js";
import type { AgentName, AgentRole, BubbleConfig } from "../../../types/bubble.js";
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
  bubbleConfig: Pick<
    BubbleConfig,
    "review_artifact_type" | "severity_gate_round" | "accuracy_critical"
  >;
  worktreePath: string;
  transcriptPath: string;
  reviewer: AgentName;
  implementer: AgentName;
  createError: (message: string) => Error;
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
    summary: string;
    createError: (message: string) => Error;
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
    createError: (message: string) => Error;
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
    createError: (message: string) => Error;
  }, dependencies: {
    resolveReviewerVerification: (input: {
      accuracyCritical: boolean;
      senderRole: AgentRole;
      refs: string[];
      worktreePath: string;
      createError: (message: string) => Error;
    }) => Promise<ReviewVerificationInputResolution | undefined>;
  }) => Promise<ReviewVerificationInputResolution | undefined>;
  resolveReviewerVerification: (input: {
    accuracyCritical: boolean;
    senderRole: AgentRole;
    refs: string[];
    worktreePath: string;
    createError: (message: string) => Error;
  }) => Promise<ReviewVerificationInputResolution | undefined>;
  readTranscriptEnvelopes?: (
    transcriptPath: string,
    options?: ReadTranscriptOptions
  ) => Promise<ProtocolEnvelope[]>;
  evaluateRepeatCleanAutoconvergeTrigger?: typeof evaluateRepeatCleanAutoconvergeTrigger;
}

export async function preparePassRouting(
  input: PreparePassRoutingInput,
  dependencies: PreparePassRoutingDependencies
): Promise<PreparePassRoutingResult> {
  const readTranscriptEnvelopesFn =
    dependencies.readTranscriptEnvelopes
    ?? readTranscriptEnvelopes;
  const evaluateRepeatCleanTrigger =
    dependencies.evaluateRepeatCleanAutoconvergeTrigger
    ?? evaluateRepeatCleanAutoconvergeTrigger;

  const reviewerPassPreparation = dependencies.prepareReviewerPass({
    senderRole: input.senderRole,
    round: input.round,
    noFindings: input.noFindings,
    findings: input.findings,
    hasFindings: input.hasFindings,
    findingsPayloadInvalid: input.findingsPayloadInvalid,
    reviewArtifactType: input.bubbleConfig.review_artifact_type,
    severityGateRound: input.bubbleConfig.severity_gate_round,
    summary: input.summary,
    createError: input.createError
  });

  const intentResolution = dependencies.resolvePassIntent(
    {
      senderRole: input.senderRole,
      noFindings: input.noFindings,
      hasFindings: input.hasFindings,
      createError: input.createError,
      ...(input.inputIntent !== undefined
        ? { inputIntent: input.inputIntent }
        : {}),
      ...(reviewerPassPreparation.inferredReviewerIntent !== undefined
        ? { inferredReviewerIntent: reviewerPassPreparation.inferredReviewerIntent }
        : {})
    },
    {
      ...(dependencies.inferDefaultPassIntent !== undefined
        ? { inferDefaultPassIntent: dependencies.inferDefaultPassIntent }
        : {})
    }
  );

  const reviewerVerification = await dependencies.prepareReviewerVerification(
    {
      reviewArtifactType: input.bubbleConfig.review_artifact_type,
      senderRole: input.senderRole,
      summary: input.summary,
      refs: input.refs,
      accuracyCritical: input.bubbleConfig.accuracy_critical === true,
      worktreePath: input.worktreePath,
      intent: intentResolution.intent,
      hasFindings: input.hasFindings,
      createError: input.createError
    },
    {
      resolveReviewerVerification: dependencies.resolveReviewerVerification
    }
  );

  const transcript = await readTranscriptEnvelopesFn(input.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });

  const repeatCleanTrigger = evaluateRepeatCleanTrigger({
    activeRole: input.senderRole,
    passIntent: intentResolution.intent,
    hasFindings: input.hasFindings,
    round: input.round,
    reviewer: input.reviewer,
    implementer: input.implementer,
    transcript
  });

  return {
    intent: intentResolution.intent,
    inferredIntent: intentResolution.inferredIntent,
    reviewerVerification,
    transcript,
    repeatCleanTrigger,
    ...(reviewerPassPreparation.reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim: reviewerPassPreparation.reviewerFindingsClaim }
      : {}),
    ...(reviewerPassPreparation.reviewerFindingsClaimParserMetadata !== undefined
      ? {
          reviewerFindingsClaimParserMetadata:
            reviewerPassPreparation.reviewerFindingsClaimParserMetadata
        }
      : {})
  };
}
