import { describe, expect, it } from "vitest";

import { renderMetaReviewSubmitText } from "../../../../src/v11/application/metaReview/metaReviewSubmitRenderers.js";

describe("metaReviewSubmitRenderers", () => {
  it("renders run id immediately after the header and preserves submit detail ordering", () => {
    const rendered = renderMetaReviewSubmitText({
      bubbleId: "bubble_submit_order",
      run_id: "run_meta_submit_order_01",
      status: "success",
      recommendation: "rework",
      summary: "Two findings remain open.",
      report_ref: "artifacts/meta-review-last.json",
      rework_target_message: "Fix the retained read export boundary.",
      updated_at: "2026-04-12T08:00:00.000Z",
      warnings: [{ reason_code: "META_REVIEWER_PANE_UNAVAILABLE", message: "ignored in text output" }],
      lifecycle_state: "RUNNING",
      gate_route: "auto_rework",
      gate_sequence: 3,
      gate_envelope_type: "PASS",
      report_json: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: 2,
        findings_parity_status: "match"
      }
    });

    expect(rendered.split("\n")).toEqual([
      "Meta-review submit for bubble_submit_order: status=success, recommendation=rework",
      "Run id: run_meta_submit_order_01",
      "Updated: 2026-04-12T08:00:00.000Z",
      "Gate route: auto_rework",
      "Lifecycle state: RUNNING",
      "Summary: Two findings remain open.",
      "Report ref: artifacts/meta-review-last.json",
      "Rework target: Fix the retained read export boundary.",
      "Findings parity: claimed=2, artifact=2, status=match",
      "Warnings: META_REVIEWER_PANE_UNAVAILABLE"
    ]);
  });
});
