import type { MetaReviewRecommendation } from "../../../shared/metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopeResult
} from "../../../ports/transcript.js";
import { MetaReviewGateError } from "../../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import type { PersistHumanGateRouteInput } from "./metaReviewGateHumanGatePersistenceContract.js";
import {
  appendHumanGateApprovalRequest
} from "./metaReviewGateHumanGatePersistenceHelpers.js";
import type { MetaReviewGateAdvisoryFinding } from "../../../domain/metaReviewGate/findingsSplit.js";

export async function appendHumanGateRequestForRoute(input: {
  persistInput: PersistHumanGateRouteInput;
  recommendation: MetaReviewRecommendation | undefined;
  advisoryFindings: MetaReviewGateAdvisoryFinding[] | undefined;
}): Promise<AppendProtocolEnvelopeResult> {
  const commonInput = {
    appendEnvelope: input.persistInput.appendEnvelope,
    transcriptPath: input.persistInput.transcriptPath,
    inboxPath: input.persistInput.inboxPath,
    lockPath: input.persistInput.lockPath,
    now: input.persistInput.now,
    bubbleId: input.persistInput.bubbleId,
    round: input.persistInput.loaded.state.round,
    summary: input.persistInput.summary,
    refs: input.persistInput.refs,
    metaReviewerAgent: input.persistInput.metaReviewerAgent,
    ...(input.persistInput.parityMetadata !== undefined
      ? { parityMetadata: input.persistInput.parityMetadata }
      : {}),
    ...(input.persistInput.gateReasonCode !== undefined
      ? { gateReasonCode: input.persistInput.gateReasonCode }
      : {}),
    ...(input.persistInput.consecutiveCleanRuns !== undefined
      ? { consecutiveCleanRuns: input.persistInput.consecutiveCleanRuns }
      : {}),
    ...(input.advisoryFindings !== undefined ? { findings: input.advisoryFindings } : {})
  };

  if (
    input.persistInput.route === "human_gate_threshold_not_met"
    || input.persistInput.route === "human_gate_threshold_unresolved"
  ) {
    if (input.recommendation !== "rework" || input.persistInput.thresholdMetadata === undefined) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        `META_REVIEW_GATE_TRANSITION_INVALID: threshold human-gate route ${input.persistInput.route} requires recommendation=rework and threshold metadata.`,
        {
          stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
        }
      );
    }
    return appendHumanGateApprovalRequest({
      ...commonInput,
      route: input.persistInput.route,
      recommendation: input.recommendation,
      thresholdMetadata: input.persistInput.thresholdMetadata
    });
  }

  return appendHumanGateApprovalRequest({
    ...commonInput,
    route: input.persistInput.route,
    ...(input.recommendation !== undefined ? { recommendation: input.recommendation } : {})
  });
}
