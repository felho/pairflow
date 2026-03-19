import { describe, expect, it } from "vitest";

import { claimParserDivergenceDiagnosticReasonCode } from "../../../../src/core/convergence/policy.js";
import { buildPassEnvelopeDraft } from "../../../../src/v11/domain/pass/passEnvelopeDraft.js";

describe("buildPassEnvelopeDraft", () => {
  it("builds implementer PASS envelope draft without reviewer-only payload fields", () => {
    const draft = buildPassEnvelopeDraft({
      bubbleId: "b_123",
      handoff: {
        senderAgent: "codex",
        senderRole: "implementer",
        recipientAgent: "claude",
        recipientRole: "reviewer",
        envelopeRound: 2
      },
      summary: "implementer handoff",
      passIntent: "review",
      refs: ["artifact://handoff.md"],
      hasFindings: false,
      findingsForPayload: [],
      reviewerFindingsClaimParserMetadata: {
        parserState: "open_findings",
        parserDivergence: true
      },
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      repeatCleanReasonDetail: "base_precondition_not_met",
      repeatCleanTrigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false
    });

    expect(draft).toMatchObject({
      bubble_id: "b_123",
      sender: "codex",
      recipient: "claude",
      type: "PASS",
      round: 2,
      refs: ["artifact://handoff.md"],
      payload: {
        summary: "implementer handoff",
        pass_intent: "review",
        metadata: {
          delivery_target_role: "reviewer",
          transition_decision: "normal_pass",
          reason_code: "REPEAT_CLEAN_TRIGGER_NOT_MET",
          reason_detail: "base_precondition_not_met",
          trigger: false,
          findings_claim_parser_state: "open_findings",
          findings_claim_parser_divergence: true,
          findings_claim_parser_divergence_reason_code:
            claimParserDivergenceDiagnosticReasonCode
        }
      }
    });
    expect(draft.payload.findings).toBeUndefined();
    expect(draft.payload.findings_claim_state).toBeUndefined();
    expect(draft.payload.findings_claim_source).toBeUndefined();
  });

  it("builds reviewer PASS envelope draft with reviewer findings payload fields", () => {
    const draft = buildPassEnvelopeDraft({
      bubbleId: "b_123",
      handoff: {
        senderAgent: "claude",
        senderRole: "reviewer",
        recipientAgent: "codex",
        recipientRole: "implementer",
        envelopeRound: 3
      },
      summary: "reviewer handoff",
      passIntent: "fix_request",
      refs: [],
      hasFindings: true,
      findingsForPayload: [{ title: "P1", priority: "P1" }],
      reviewerFindingsClaim: {
        state: "open_findings",
        source: "payload_findings_count"
      },
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: "PREVIOUS_REVIEWER_PASS_NOT_CLEAN",
      repeatCleanReasonDetail: "previous_reviewer_pass_not_clean",
      repeatCleanTrigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false
    });

    expect(draft.payload.findings).toEqual([{ title: "P1", priority: "P1" }]);
    expect(draft.payload.findings_claim_state).toBe("open_findings");
    expect(draft.payload.findings_claim_source).toBe("payload_findings_count");
    expect(draft.payload.metadata?.delivery_target_role).toBe("implementer");
  });

  it("falls back to unknown findings claim state when reviewer claim is absent", () => {
    const draft = buildPassEnvelopeDraft({
      bubbleId: "b_123",
      handoff: {
        senderAgent: "claude",
        senderRole: "reviewer",
        recipientAgent: "codex",
        recipientRole: "implementer",
        envelopeRound: 4
      },
      summary: "reviewer clean",
      passIntent: "review",
      refs: [],
      hasFindings: false,
      findingsForPayload: [{ title: "ignored", priority: "P2" }],
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
      repeatCleanReasonDetail: "previous_reviewer_pass_clean",
      repeatCleanTrigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: true
    });

    expect(draft.payload.findings).toEqual([]);
    expect(draft.payload.findings_claim_state).toBe("unknown");
    expect(draft.payload.findings_claim_source).toBe("payload_findings_count");
  });
});
