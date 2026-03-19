import { describe, expect, it } from "vitest";

import {
  applyMetaReviewGateOnConvergence,
  asMetaReviewGateError,
  MetaReviewGateError,
  notifyMetaReviewerSubmissionRequest,
  recoverMetaReviewGateFromSnapshot,
  toMetaReviewGateError
} from "../../../../src/core/bubble/metaReviewGate.js";
import {
  applyMetaReviewGateOnConvergenceV11,
  asMetaReviewGateErrorV11,
  MetaReviewGateErrorV11,
  notifyMetaReviewerSubmissionRequestV11,
  recoverMetaReviewGateFromSnapshotV11,
  toMetaReviewGateErrorV11
} from "../../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";

describe("meta-review gate facade parity", () => {
  it("keeps v11 meta-review gate exports aligned with core source-of-truth", () => {
    expect(applyMetaReviewGateOnConvergenceV11).toBe(applyMetaReviewGateOnConvergence);
    expect(recoverMetaReviewGateFromSnapshotV11).toBe(recoverMetaReviewGateFromSnapshot);
    expect(notifyMetaReviewerSubmissionRequestV11).toBe(notifyMetaReviewerSubmissionRequest);
    expect(toMetaReviewGateErrorV11).toBe(toMetaReviewGateError);
    expect(asMetaReviewGateErrorV11).toBe(asMetaReviewGateError);
    expect(MetaReviewGateErrorV11).toBe(MetaReviewGateError);
  });
});
