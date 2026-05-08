import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../convergence/repeatCleanAutoconverge.js";
import { claimParserDivergenceDiagnosticReasonCode } from "../convergence/policy.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent } from "../../../contracts/kernel/protocol.js";
import {
  deliveryTargetRoleMetadataKey,
  type ProtocolEnvelopeDraft
} from "../../../types/protocol.js";
import type { ResolvedPassHandoff } from "./handoff.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "./reviewerFindingsClaim.js";
import { buildRepeatCleanPassPayloadMetadata } from "./repeatCleanMetadata.js";

export interface BuildPassEnvelopeDraftInput {
  bubbleId: string;
  handoff: Pick<
    ResolvedPassHandoff,
    "senderAgent" | "recipientAgent" | "senderRole" | "recipientRole" | "envelopeRound"
  >;
  summary: string;
  passIntent: PassIntent;
  refs: string[];
  hasFindings: boolean;
  findingsForPayload: Finding[];
  reviewerFindingsClaim?: ReviewerFindingsClaim;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
  transitionDecision: "normal_pass" | "auto_converge";
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}

export function buildPassEnvelopeDraft(
  input: BuildPassEnvelopeDraftInput
): ProtocolEnvelopeDraft {
  return {
    bubble_id: input.bubbleId,
    sender: input.handoff.senderAgent,
    recipient: input.handoff.recipientAgent,
    type: "PASS",
    round: input.handoff.envelopeRound,
    payload: {
      summary: input.summary,
      pass_intent: input.passIntent,
      metadata: {
        ...buildRepeatCleanPassPayloadMetadata({
          transitionDecision: input.transitionDecision,
          reasonCode: input.repeatCleanReasonCode,
          reasonDetail: input.repeatCleanReasonDetail,
          trigger: input.repeatCleanTrigger,
          mostRecentPreviousReviewerCleanPassEnvelope:
            input.mostRecentPreviousReviewerCleanPassEnvelope
        }),
        [deliveryTargetRoleMetadataKey]: input.handoff.recipientRole,
        ...(input.reviewerFindingsClaimParserMetadata !== undefined
          ? {
              findings_claim_parser_state:
                input.reviewerFindingsClaimParserMetadata.parserState,
              findings_claim_parser_divergence:
                input.reviewerFindingsClaimParserMetadata.parserDivergence,
              ...(input.reviewerFindingsClaimParserMetadata.parserDivergence
                ? {
                    findings_claim_parser_divergence_reason_code:
                      claimParserDivergenceDiagnosticReasonCode
                  }
                : {})
            }
          : {})
      },
      ...(input.handoff.senderRole === "reviewer"
        ? {
            findings: input.hasFindings ? input.findingsForPayload : [],
            findings_claim_state: input.reviewerFindingsClaim?.state ?? "unknown",
            findings_claim_source:
              input.reviewerFindingsClaim?.source ?? "payload_findings_count"
          }
        : {})
    },
    refs: input.refs
  };
}
