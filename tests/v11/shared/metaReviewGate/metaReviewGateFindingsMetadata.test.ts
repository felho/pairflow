import { describe, expect, it } from "vitest";

import {
  resolveAdvisoryFindingsFromReportJson,
  resolveFindingsOpenSplitFromReportJson,
  resolveFindingsParityMetadataFromReportJson
} from "../../../../src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.js";

describe("resolveFindingsOpenSplitFromReportJson", () => {
  it("prefers explicit advisory/blocking split totals when present", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 3,
      findings: [
        { severity: "P2", title: "advisory-a" }
      ]
    });

    expect(split).toEqual({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 3
    });
  });

  it("derives advisory/blocking split from findings list when explicit fields are absent", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings: [
        { severity: "P1", title: "blocking-a" },
        { severity: "P2", title: "advisory-a" },
        { severity: "P3", title: "advisory-b" }
      ]
    });

    expect(split).toEqual({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 2
    });
  });
});

describe("resolveFindingsParityMetadataFromReportJson", () => {
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

describe("resolveAdvisoryFindingsFromReportJson", () => {
  it("returns advisory findings only with normalized title and optional refs", () => {
    const findings = resolveAdvisoryFindingsFromReportJson({
      findings: [
        { severity: "P2", title: "  advisory-a  ", refs: ["artifact://a", " "] },
        { priority: "P3", title: "advisory-b" },
        { severity: "P1", title: "blocking-ignored" },
        { severity: "P2", title: "" },
        "invalid"
      ]
    });

    expect(findings).toEqual([
      {
        severity: "P2",
        title: "advisory-a",
        refs: ["artifact://a"]
      },
      {
        severity: "P3",
        title: "advisory-b"
      }
    ]);
  });

  it("returns undefined when report json is undefined or has no advisory findings", () => {
    expect(resolveAdvisoryFindingsFromReportJson(undefined)).toBeUndefined();
    expect(
      resolveAdvisoryFindingsFromReportJson({
        findings: [{ severity: "P1", title: "blocking-only" }]
      })
    ).toBeUndefined();
  });
});
