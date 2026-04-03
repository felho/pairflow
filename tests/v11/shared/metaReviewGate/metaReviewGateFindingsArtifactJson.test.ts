import type { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  readMetaReviewReportJsonArtifact
} from "../../../../src/v11/shared/metaReviewGate/metaReviewGateFindingsArtifactJson.js";
import {
  resolveFindingsCountFromMetaReviewReportJson
} from "../../../../src/v11/shared/metaReviewGate/metaReviewGateFindingsClaimParsing.js";

function buildReadFileStub(content: string): typeof readFile {
  return ((async () => content) as unknown) as typeof readFile;
}

describe("meta-review findings artifact parsing", () => {
  it("rejects flat top-level claim fields without canonical report_json wrapper", async () => {
    const artifact = JSON.stringify({
      findings_claim_state: "clean",
      findings_claim_source: "meta_review_artifact",
      findings_count: 0
    });

    const result = await readMetaReviewReportJsonArtifact({
      artifactPath: "/tmp/meta-review-last.json",
      readFileFn: buildReadFileStub(artifact)
    });

    expect(result.reportJson).toBeUndefined();
    expect(result.diagnostics).toContain(
      "META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: /tmp/meta-review-last.json: report_json claim object missing."
    );
  });

  it("accepts canonical nested report_json artifacts", async () => {
    const artifact = JSON.stringify({
      report_json: {
        findings_claim_state: "clean",
        findings_claim_source: "meta_review_artifact",
        findings_count: 0
      }
    });

    const result = await readMetaReviewReportJsonArtifact({
      artifactPath: "/tmp/meta-review-last.json",
      readFileFn: buildReadFileStub(artifact)
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.reportJson).toEqual({
      findings_claim_state: "clean",
      findings_claim_source: "meta_review_artifact",
      findings_count: 0
    });
  });
});

describe("meta-review findings count parsing", () => {
  it("accepts only explicit findings_count", () => {
    expect(
      resolveFindingsCountFromMetaReviewReportJson({
        findings_count: 2,
        findings: [{ id: "ignored" }]
      })
    ).toBe(2);
  });

  it("does not derive findings_count from legacy findings fields", () => {
    expect(
      resolveFindingsCountFromMetaReviewReportJson({
        findings: 2
      })
    ).toBeUndefined();
    expect(
      resolveFindingsCountFromMetaReviewReportJson({
        findings: [{ id: "a" }, { id: "b" }]
      })
    ).toBeUndefined();
  });
});
