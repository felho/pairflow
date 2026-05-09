import { describe, expect, it } from "vitest";

import {
  resolveMetaReviewRouteRecommendation,
  resolveMetaReviewRouteStatus
} from "../../../../src/v11/application/converged/internal/finalization/convergedFinalizationMetadata.js";

describe("convergedFinalizationMetadata", () => {
  it("treats threshold-human-gate routes as successful rework handoff", () => {
    expect(
      resolveMetaReviewRouteRecommendation({
        route: "human_gate_threshold_not_met"
      })
    ).toBe("rework");
    expect(
      resolveMetaReviewRouteRecommendation({
        route: "human_gate_threshold_unresolved"
      })
    ).toBe("rework");
    expect(
      resolveMetaReviewRouteStatus({
        route: "human_gate_threshold_not_met"
      })
    ).toBe("success");
    expect(
      resolveMetaReviewRouteStatus({
        route: "human_gate_threshold_unresolved"
      })
    ).toBe("success");
  });
});
