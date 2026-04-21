import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/types/bubble.js";
import {
  buildBubbleReviewPolicyRuntimeView,
  normalizeBubbleReviewPolicy
} from "../../../../src/v11/shared/reviewPolicy/reviewPolicyRuntime.js";

function createConfig(
  reviewPolicy?: BubbleConfig["review_policy"]
): Pick<BubbleConfig, "review_policy"> {
  return reviewPolicy === undefined ? {} : { review_policy: reviewPolicy };
}

describe("reviewPolicyRuntime", () => {
  it("normalizes missing review_policy to deterministic defaults", () => {
    expect(normalizeBubbleReviewPolicy(createConfig(undefined))).toEqual({
      review_loop_mode: "full",
      meta_review_auto_rework_min_severity: "P1"
    });
  });

  it("builds an enabled runtime view for the default full loop", () => {
    expect(
      buildBubbleReviewPolicyRuntimeView(
        createConfig({
          review_loop_mode: "full",
          meta_review_auto_rework_min_severity: "P2"
        })
      )
    ).toEqual({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      meta_review_auto_rework_min_severity: "P2"
    });
  });

  it("guards meta_only so effective loop mode stays full in phase 1", () => {
    expect(
      buildBubbleReviewPolicyRuntimeView(
        createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        })
      )
    ).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      meta_review_auto_rework_min_severity: "P3",
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
    });
  });
});
