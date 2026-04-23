import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/types/bubble.js";
import {
  buildRuntimeAlignedReviewPolicyRuntimeView,
  buildPassPathReviewPolicyRuntimeView,
  buildBubbleReviewPolicyRuntimeView,
  normalizeRuntimeAlignedExecutionContext,
  normalizeBubbleReviewPolicy,
  normalizeRuntimeAlignedRole,
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

  it("enables meta_only on residual consumers when runtime authority proves implementer activity", () => {
    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P2"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "implementer",
          round: 2,
          handoffId: "implementer:b_runtime_01:round:2:attempt:1",
          executionId: "exec_runtime_01_round_2"
        }
      })
    ).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "meta_only",
      support_status: "enabled",
      meta_review_auto_rework_min_severity: "P2"
    });
  });

  it("fails closed on residual consumers when runtime state is invalid or unavailable", () => {
    const expected = {
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      meta_review_auto_rework_min_severity: "P3",
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
      blocked_prerequisites: [REVIEW_POLICY_META_ONLY_ACTIVATION_REQUIRED],
      provenance_note:
        REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED_PROVENANCE_NOTE
    };

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "implementer",
          round: 2,
          handoffId: "implementer:b_runtime_02:round:2:attempt:1",
          executionId: "exec_runtime_02_round_2"
        },
        runtimeStateInvalid: true
      })
    ).toEqual(expected);

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "implementer",
          round: 2,
          handoffId: "implementer:b_runtime_03:round:2:attempt:1",
          executionId: "exec_runtime_03_round_2"
        },
        runtimeAvailability: "missing"
      })
    ).toEqual(expected);

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "implementer",
          round: 2,
          handoffId: "implementer:b_runtime_03b:round:2:attempt:1",
          executionId: "exec_runtime_03b_round_2"
        },
        runtimeAvailability: "inactive"
      })
    ).toEqual(expected);
  });

  it("fails closed when runtime-aligned activation proof branches are incomplete", () => {
    const expected = {
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      meta_review_auto_rework_min_severity: "P3",
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
      blocked_prerequisites: [REVIEW_POLICY_META_ONLY_ACTIVATION_REQUIRED],
      provenance_note:
        REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED_PROVENANCE_NOTE
    };

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "reviewer",
        executionContext: {
          activeRole: "implementer",
          round: 2,
          handoffId: "implementer:b_runtime_04:round:2:attempt:1",
          executionId: "exec_runtime_04_round_2"
        }
      })
    ).toEqual(expected);

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "reviewer",
          round: 2,
          handoffId: "implementer:b_runtime_05:round:2:attempt:1",
          executionId: "exec_runtime_05_round_2"
        }
      })
    ).toEqual(expected);

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "implementer",
          round: 1,
          handoffId: "implementer:b_runtime_06:round:1:attempt:1",
          executionId: "exec_runtime_06_round_1"
        }
      })
    ).toEqual(expected);

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "implementer",
          round: 2,
          handoffId: "exec_runtime_07_round_2",
          executionId: "exec_runtime_07_round_2"
        }
      })
    ).toEqual(expected);

    expect(
      buildRuntimeAlignedReviewPolicyRuntimeView({
        config: createConfig({
          review_loop_mode: "meta_only",
          meta_review_auto_rework_min_severity: "P3"
        }),
        round: 2,
        activeRole: "implementer",
        executionContext: {
          activeRole: "implementer",
          round: 2,
          handoffId: "implementer:b_runtime_08:round:2:attempt:1",
          executionId: "   "
        }
      })
    ).toEqual(expected);
  });

  it("normalizes runtime-aligned role values defensively", () => {
    expect(normalizeRuntimeAlignedRole("implementer")).toBe("implementer");
    expect(normalizeRuntimeAlignedRole("meta_reviewer")).toBe("meta_reviewer");
    expect(normalizeRuntimeAlignedRole("human")).toBeNull();
    expect(normalizeRuntimeAlignedRole(null)).toBeNull();
  });

  it("normalizes runtime-aligned execution context defensively", () => {
    expect(
      normalizeRuntimeAlignedExecutionContext({
        activeRole: "implementer",
        round: 2,
        handoffId: "implementer:b_runtime_09:round:2:attempt:1",
        executionId: "exec_runtime_09_round_2"
      })
    ).toEqual({
      activeRole: "implementer",
      round: 2,
      handoffId: "implementer:b_runtime_09:round:2:attempt:1",
      executionId: "exec_runtime_09_round_2"
    });
    expect(
      normalizeRuntimeAlignedExecutionContext({
        activeRole: "human",
        round: 2,
        handoffId: "handoff",
        executionId: "execution"
      })
    ).toBeNull();
    expect(normalizeRuntimeAlignedExecutionContext(null)).toBeNull();
  });
});
