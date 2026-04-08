import { describe, expect, it } from "vitest";

import {
  readMetaReviewParitySnapshotFromArtifactRaw,
  resolveReportArtifactPath
} from "../../../../src/v11/shared/metaReview/metaReviewCommandReadArtifacts.js";
import { MetaReviewError } from "../../../../src/v11/shared/metaReview/metaReviewError.js";

describe("metaReviewCommandReadArtifacts", () => {
  it("adds context when report_ref is not a safe artifacts reference", () => {
    expect(() =>
      resolveReportArtifactPath({
        bubbleDir: "/repo/.pairflow/bubbles/b_meta_01",
        artifactsDir: "/repo/.pairflow/bubbles/b_meta_01/artifacts",
        reportRef: "../escape.json"
      })
    ).toThrow(MetaReviewError);

    try {
      resolveReportArtifactPath({
        bubbleDir: "/repo/.pairflow/bubbles/b_meta_01",
        artifactsDir: "/repo/.pairflow/bubbles/b_meta_01/artifacts",
        reportRef: "../escape.json"
      });
      throw new Error("Expected MetaReviewError");
    } catch (error) {
      expect(error).toMatchObject({
        reasonCode: "META_REVIEW_SCHEMA_INVALID",
        context: {
          source: "resolve_report_artifact_path",
          reason: "unsafe_report_ref",
          reportRef: "../escape.json"
        }
      });
    }
  });

  it("parses invalid artifact JSON into parity diagnostics without throwing", () => {
    expect(
      readMetaReviewParitySnapshotFromArtifactRaw("{")
    ).toMatchObject({
      diagnostics: ["META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED"],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    });
  });
});
