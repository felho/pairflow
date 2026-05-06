import { describe, expect, it } from "vitest";

import {
  resolveFindingsArtifactOpenTotalFromArtifact,
  resolveFindingsParityMetadataFromReportJson
} from "../../../../src/v11/domain/metaReviewGate/findingsParityMetadata.js";

describe("findings parity metadata", () => {
  it("derives open_total from findings when explicit totals are absent", () => {
    const openTotal = resolveFindingsArtifactOpenTotalFromArtifact({
      findings: [
        { severity: "blocking", title: "blocking-a" },
        { priority: "P2", title: "advisory-a" },
        { severity: "P3", title: "advisory-b" }
      ]
    });

    expect(openTotal).toBe(3);
  });

  it("accepts advisory severity alias when deriving open_total from findings artifacts", () => {
    const openTotal = resolveFindingsArtifactOpenTotalFromArtifact({
      findings: [
        { severity: "blocking", title: "blocking-a" },
        { severity: "advisory", title: "advisory-alias-a" },
        { severity: "advisory", title: "advisory-alias-b" }
      ]
    });

    expect(openTotal).toBe(3);
  });

  it("prefers explicit findings_claimed_open_total over derived findings_count", () => {
    const metadata = resolveFindingsParityMetadataFromReportJson({
      findings_count: 5,
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });

    expect(metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });
  });

  it("includes advisory/blocking split fields in parity metadata", () => {
    const metadata = resolveFindingsParityMetadataFromReportJson({
      findings_count: 2,
      findings_artifact_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_status: "available",
      findings_digest_sha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      meta_review_run_id: "run_meta_01",
      findings_parity_status: "ok"
    });

    expect(metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_artifact_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_status: "available",
      findings_parity_status: "ok"
    });
  });
});
