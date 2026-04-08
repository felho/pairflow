import { describe, expect, it } from "vitest";

import { resolveSubmitCanonicalRunId } from "../../../../src/v11/shared/metaReview/metaReviewCommandSubmitLink.js";
import { MetaReviewError } from "../../../../src/v11/shared/metaReview/metaReviewError.js";

describe("metaReviewCommandSubmitLink", () => {
  it("adds context when run-link fields are invalid", () => {
    expect(() =>
      resolveSubmitCanonicalRunId({
        recommendation: "approve",
        reportJson: {
          meta_review_run_id: ""
        },
        generatedRunId: "run_01"
      })
    ).toThrow(MetaReviewError);

    try {
      resolveSubmitCanonicalRunId({
        recommendation: "approve",
        reportJson: {
          meta_review_run_id: ""
        },
        generatedRunId: "run_01"
      });
      throw new Error("Expected MetaReviewError");
    } catch (error) {
      expect(error).toMatchObject({
        reasonCode: "META_REVIEW_SCHEMA_INVALID",
        context: {
          source: "resolve_submit_canonical_run_id",
          reason: "invalid_run_link_field"
        }
      });
    }
  });

  it("adds context when rework submit is missing explicit run-link metadata", () => {
    try {
      resolveSubmitCanonicalRunId({
        recommendation: "rework",
        reportJson: {},
        generatedRunId: "run_02"
      });
      throw new Error("Expected MetaReviewError");
    } catch (error) {
      expect(error).toMatchObject({
        reasonCode: "META_REVIEW_SCHEMA_INVALID",
        context: {
          source: "resolve_submit_canonical_run_id",
          reason: "missing_rework_run_link"
        }
      });
    }
  });
});
