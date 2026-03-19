import { describe, expect, it } from "vitest";

import {
  getMetaReviewLastReport,
  getMetaReviewStatus,
  MetaReviewError,
  runMetaReview,
  submitMetaReviewResult,
  toMetaReviewError
} from "../../../../src/core/bubble/metaReview.js";
import {
  getMetaReviewLastReportV11,
  getMetaReviewStatusV11,
  MetaReviewErrorV11,
  runMetaReviewV11,
  submitMetaReviewResultV11,
  toMetaReviewErrorV11
} from "../../../../src/v11/application/metaReview/emitMetaReviewV11.js";

describe("meta-review facade parity", () => {
  it("keeps v11 meta-review exports aligned with core source-of-truth", () => {
    expect(runMetaReviewV11).toBe(runMetaReview);
    expect(submitMetaReviewResultV11).toBe(submitMetaReviewResult);
    expect(getMetaReviewStatusV11).toBe(getMetaReviewStatus);
    expect(getMetaReviewLastReportV11).toBe(getMetaReviewLastReport);
    expect(toMetaReviewErrorV11).toBe(toMetaReviewError);
    expect(MetaReviewErrorV11).toBe(MetaReviewError);
  });
});

