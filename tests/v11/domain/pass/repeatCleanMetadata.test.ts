import { describe, expect, it } from "vitest";

import {
  buildRepeatCleanLifecycleMetadata,
  buildRepeatCleanPassPayloadMetadata,
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata
} from "../../../../src/v11/domain/pass/repeatCleanMetadata.js";

describe("repeatCleanMetadata", () => {
  it("resolves canonical metadata key first and falls back to legacy alias", () => {
    expect(
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata({
        most_recent_previous_reviewer_pass_is_clean: false,
        most_recent_previous_reviewer_clean_pass_envelope: true
      })
    ).toBe(false);

    expect(
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata({
        most_recent_previous_reviewer_clean_pass_envelope: true
      })
    ).toBe(true);

    expect(
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(undefined)
    ).toBeUndefined();
  });

  it("builds repeat-clean pass payload metadata with canonical and legacy keys", () => {
    const metadata = buildRepeatCleanPassPayloadMetadata({
      transitionDecision: "normal_pass",
      reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      reasonDetail: "base_precondition_not_met",
      trigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: true
    });

    expect(metadata).toEqual({
      transition_decision: "normal_pass",
      reason_code: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      reason_detail: "base_precondition_not_met",
      trigger: false,
      most_recent_previous_reviewer_pass_is_clean: true,
      most_recent_previous_reviewer_clean_pass_envelope: true
    });
  });

  it("builds repeat-clean lifecycle metadata with canonical and legacy keys", () => {
    const metadata = buildRepeatCleanLifecycleMetadata({
      transitionDecision: "auto_converge",
      reasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
      reasonDetail: "previous_reviewer_pass_clean",
      trigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: false
    });

    expect(metadata).toEqual({
      transition_decision: "auto_converge",
      repeat_clean_trigger: true,
      repeat_clean_reason_code: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
      repeat_clean_reason_detail: "previous_reviewer_pass_clean",
      most_recent_previous_reviewer_pass_is_clean: false,
      most_recent_previous_reviewer_clean_pass_envelope: false
    });
  });
});
