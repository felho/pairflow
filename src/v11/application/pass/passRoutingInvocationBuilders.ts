import type {
  BubbleConfig,
  BubbleReviewAutoReworkSeverity
} from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent, ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReadTranscriptOptions } from "../../shared/ports/transcript.js";
import {
  type PreparePassRoutingDependencies,
  type PreparePassRoutingInput
} from "./passRoutingPreparation.js";

export interface BuildPassRoutingInputInput {
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
  reviewer: BubbleConfig["agents"]["reviewer"];
  implementer: BubbleConfig["agents"]["implementer"];
  createError: PairflowCreateCommandError;
}

export function buildPassRoutingInput(
  input: BuildPassRoutingInputInput
): PreparePassRoutingInput {
  return {
    senderRole: input.senderRole,
    round: input.round,
    summary: input.summary,
    ...(input.inputIntent !== undefined
      ? { inputIntent: input.inputIntent }
      : {}),
    refs: input.refs,
    findings: input.findings,
    hasFindings: input.hasFindings,
    noFindings: input.noFindings,
    findingsPayloadInvalid: input.findingsPayloadInvalid,
    reviewerBlockingMinSeverity: input.reviewerBlockingMinSeverity,
    bubbleConfig: {
      review_artifact_type: input.bubbleConfig.review_artifact_type,
      severity_gate_round: input.bubbleConfig.severity_gate_round,
      ...(input.bubbleConfig.accuracy_critical !== undefined
        ? { accuracy_critical: input.bubbleConfig.accuracy_critical }
        : {})
    },
    worktreePath: input.worktreePath,
    transcriptPath: input.transcriptPath,
    reviewer: input.reviewer,
    implementer: input.implementer,
    createError: input.createError
  };
}

export interface BuildPassRoutingDependenciesInput {
  prepareReviewerPass: PreparePassRoutingDependencies["prepareReviewerPass"];
  resolvePassIntent: PreparePassRoutingDependencies["resolvePassIntent"];
  prepareReviewerVerification:
    PreparePassRoutingDependencies["prepareReviewerVerification"];
  resolveReviewerVerification:
    PreparePassRoutingDependencies["resolveReviewerVerification"];
  inferDefaultPassIntent?: PreparePassRoutingDependencies["inferDefaultPassIntent"];
  readTranscriptEnvelopes?: (
    transcriptPath: string,
    options?: ReadTranscriptOptions
  ) => Promise<ProtocolEnvelope[]>;
  evaluateRepeatCleanAutoconvergeTrigger?:
    PreparePassRoutingDependencies["evaluateRepeatCleanAutoconvergeTrigger"];
}

export function buildPassRoutingDependencies(
  input: BuildPassRoutingDependenciesInput
): PreparePassRoutingDependencies {
  return {
    prepareReviewerPass: input.prepareReviewerPass,
    resolvePassIntent: input.resolvePassIntent,
    prepareReviewerVerification: input.prepareReviewerVerification,
    resolveReviewerVerification: input.resolveReviewerVerification,
    ...(input.inferDefaultPassIntent !== undefined
      ? { inferDefaultPassIntent: input.inferDefaultPassIntent }
      : {}),
    ...(input.readTranscriptEnvelopes !== undefined
      ? { readTranscriptEnvelopes: input.readTranscriptEnvelopes }
      : {}),
    ...(input.evaluateRepeatCleanAutoconvergeTrigger !== undefined
      ? {
          evaluateRepeatCleanAutoconvergeTrigger:
            input.evaluateRepeatCleanAutoconvergeTrigger
        }
      : {})
  };
}
