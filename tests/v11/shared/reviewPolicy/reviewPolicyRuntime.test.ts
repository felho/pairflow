import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/types/bubble.js";
import {
  buildPassPathReviewPolicyRuntimeView,
  buildBubbleReviewPolicyRuntimeView,
  normalizeBubbleReviewPolicy,
  REVIEW_POLICY_META_ONLY_ACTIVATION_REQUIRED,
  REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED_PROVENANCE_NOTE,
  REVIEW_POLICY_META_ONLY_PHASE3B_PENDING,
  REVIEW_POLICY_META_ONLY_PROVENANCE_NOTE
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

  it("keeps default runtime view free of guarded diagnostics when review_policy is missing", () => {
    expect(buildBubbleReviewPolicyRuntimeView(createConfig(undefined))).toEqual({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      meta_review_auto_rework_min_severity: "P1"
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
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED",
      blocked_prerequisites: [REVIEW_POLICY_META_ONLY_PHASE3B_PENDING],
      provenance_note: REVIEW_POLICY_META_ONLY_PROVENANCE_NOTE
    });
  });

  it("enables meta_only on the pass path only when activation is proven", () => {
    expect(
      buildPassPathReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P2"
        }),
        activationProven: true
      })
    ).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "meta_only",
      support_status: "enabled",
      meta_review_auto_rework_min_severity: "P2"
    });
  });

  it("keeps full-loop requests enabled on the pass path without activation gating", () => {
    expect(
      buildPassPathReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "full",
          meta_review_auto_rework_min_severity: "P3"
        }),
        activationProven: false
      })
    ).toEqual({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      meta_review_auto_rework_min_severity: "P3"
    });
  });

  it("fails closed on the pass path when meta_only activation is unresolved", () => {
    expect(
      buildPassPathReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        activationProven: false
      })
    ).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      meta_review_auto_rework_min_severity: "P3",
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
      blocked_prerequisites: [REVIEW_POLICY_META_ONLY_ACTIVATION_REQUIRED],
      provenance_note:
        REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED_PROVENANCE_NOTE
    });
  });
});
