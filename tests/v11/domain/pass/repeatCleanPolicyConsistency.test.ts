import { describe, expect, it } from "vitest";

import { buildPassLifecycleMetricMetadata } from "../../../../src/v11/domain/pass/lifecycleMetricMetadata.js";
import { buildPassEnvelopeDraft } from "../../../../src/v11/domain/pass/passEnvelopeDraft.js";
import { resolveMostRecentPreviousReviewerPassIsCleanFromMetadata } from "../../../../src/v11/domain/pass/repeatCleanMetadata.js";

describe("repeatClean policy consistency", () => {
  it("keeps repeat-clean metadata aligned between transcript payload and lifecycle metrics", () => {
    const cases = [
      {
        transitionDecision: "normal_pass" as const,
        reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET" as const,
        reasonDetail: "base_precondition_not_met" as const,
        trigger: false,
        previousReviewerPassIsClean: false
      },
      {
        transitionDecision: "auto_converge" as const,
        reasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED" as const,
        reasonDetail: "previous_reviewer_pass_clean" as const,
        trigger: true,
        previousReviewerPassIsClean: true
      }
    ];

    for (const sample of cases) {
      const envelopeDraft = buildPassEnvelopeDraft({
        bubbleId: "b_repeat_clean_policy_01",
        handoff: {
          senderAgent: "claude",
          senderRole: "reviewer",
          recipientAgent: "codex",
          recipientRole: "implementer",
          envelopeRound: 3
        },
        summary: "repeat-clean consistency",
        passIntent: "review",
        refs: [],
        hasFindings: false,
        findingsForPayload: [],
        transitionDecision: sample.transitionDecision,
        repeatCleanReasonCode: sample.reasonCode,
        repeatCleanReasonDetail: sample.reasonDetail,
        repeatCleanTrigger: sample.trigger,
        mostRecentPreviousReviewerCleanPassEnvelope:
          sample.previousReviewerPassIsClean
      });

      const lifecycleMetadata = buildPassLifecycleMetricMetadata({
        passIntent: "review",
        inferredIntent: false,
        sender: "claude",
        recipient: "codex",
        recipientRole: "implementer",
        refsCount: 0,
        hasFindings: false,
        noFindings: true,
        transitionDecision: sample.transitionDecision,
        repeatCleanReasonCode: sample.reasonCode,
        repeatCleanReasonDetail: sample.reasonDetail,
        repeatCleanTrigger: sample.trigger,
        mostRecentPreviousReviewerCleanPassEnvelope:
          sample.previousReviewerPassIsClean,
        findings: []
      });

      expect(envelopeDraft.payload.metadata).toMatchObject({
        transition_decision: sample.transitionDecision,
        reason_code: sample.reasonCode,
        reason_detail: sample.reasonDetail,
        trigger: sample.trigger,
        most_recent_previous_reviewer_pass_is_clean:
          sample.previousReviewerPassIsClean,
        most_recent_previous_reviewer_clean_pass_envelope:
          sample.previousReviewerPassIsClean
      });

      expect(lifecycleMetadata).toMatchObject({
        transition_decision: sample.transitionDecision,
        repeat_clean_reason_code: sample.reasonCode,
        repeat_clean_reason_detail: sample.reasonDetail,
        repeat_clean_trigger: sample.trigger,
        most_recent_previous_reviewer_pass_is_clean:
          sample.previousReviewerPassIsClean,
        most_recent_previous_reviewer_clean_pass_envelope:
          sample.previousReviewerPassIsClean
      });

      expect(
        resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
          envelopeDraft.payload.metadata
        )
      ).toBe(sample.previousReviewerPassIsClean);
      expect(
        resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
          lifecycleMetadata
        )
      ).toBe(sample.previousReviewerPassIsClean);
    }
  });
});
