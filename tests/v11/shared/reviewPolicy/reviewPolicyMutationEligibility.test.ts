import { describe, expect, it } from "vitest";

import {
  bubbleLifecycleStates,
  type BubbleLifecycleState
} from "../../../../src/types/bubble.js";
import {
  isReviewPolicyMutableState,
  reviewPolicyMutableStates
} from "../../../../src/v11/shared/reviewPolicy/reviewPolicyMutationEligibility.js";

describe("reviewPolicyMutationEligibility", () => {
  it("keeps the mutable lifecycle allowlist explicit and closed", () => {
    expect(reviewPolicyMutableStates).toEqual([
      "CREATED",
      "PREPARING_WORKSPACE",
      "RUNNING",
      "WAITING_HUMAN",
      "READY_FOR_HUMAN_APPROVAL"
    ]);
  });

  it("accepts only mutable non-terminal states for review-policy updates", () => {
    const mutableStates = new Set<BubbleLifecycleState>(
      reviewPolicyMutableStates
    );

    for (const state of bubbleLifecycleStates) {
      expect(isReviewPolicyMutableState(state)).toBe(mutableStates.has(state));
    }
  });
});
