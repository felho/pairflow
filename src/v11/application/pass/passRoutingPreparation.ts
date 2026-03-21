import {
  evaluateRepeatCleanAutoconvergeTrigger,
} from "../../../core/convergence/repeatCleanAutoconverge.js";
import { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import type {
  PreparePassRoutingDependencies,
  PreparePassRoutingInput,
  PreparePassRoutingResult
} from "./passRoutingPreparationTypes.js";
export type {
  PreparePassRoutingDependencies,
  PreparePassRoutingInput,
  PreparePassRoutingResult
} from "./passRoutingPreparationTypes.js";

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
