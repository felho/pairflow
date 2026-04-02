import { describe, expect, it } from "vitest";

import {
  resolveLatestSameRoundReviewerSnapshot,
  resolveAdvisoryFindingsFromReportJson,
  resolveFindingsArtifactOpenTotalFromArtifact,
  resolveFindingsOpenSplitFromReportJson,
  resolveSameRoundReviewerSnapshotFromEnvelope,
  resolveFindingsParityMetadataFromReportJson
} from "../../../../src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.js";

describe("resolveFindingsOpenSplitFromReportJson", () => {
  it("returns null split fields for empty report_json input", () => {
    const split = resolveFindingsOpenSplitFromReportJson({});

    expect(split).toEqual({
      findings_blocking_open_total: null,
      findings_advisory_open_total: null
    });
  });

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

  it("fails closed when explicit split fields are present but invalid", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_blocking_open_total: -1,
      findings_advisory_open_total: 2,
      findings: [
        { severity: "P1", title: "blocking-a" },
        { severity: "P2", title: "advisory-a" }
      ]
    });

    expect(split).toEqual({
      findings_blocking_open_total: null,
      findings_advisory_open_total: null
    });
  });

  it("fails closed symmetrically when advisory split field is explicitly invalid", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: "2",
      findings: [
        { severity: "P1", title: "blocking-a" },
        { severity: "P2", title: "advisory-a" }
      ]
    });

    expect(split).toEqual({
      findings_blocking_open_total: null,
      findings_advisory_open_total: null
    });
  });

  it("derives only the missing split field when the other explicit split field is valid", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_blocking_open_total: 1,
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

  it("derives missing blocking split field when advisory split field is explicitly valid", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_advisory_open_total: 2,
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

describe("resolveFindingsArtifactOpenTotalFromArtifact", () => {
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
});

describe("resolveFindingsParityMetadataFromReportJson", () => {
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

  it("returns undefined when report json is undefined and when findings contain only blocking entries", () => {
    expect(resolveAdvisoryFindingsFromReportJson(undefined)).toBeUndefined();
    expect(
      resolveAdvisoryFindingsFromReportJson({
        findings: [{ severity: "P1", title: "blocking-only" }]
      })
    ).toBeUndefined();
  });

  it("preserves explicit empty advisory payloads", () => {
    expect(
      resolveAdvisoryFindingsFromReportJson({
        findings: []
      })
    ).toEqual([]);
  });

  it("returns undefined when findings is missing or not an array", () => {
    expect(resolveAdvisoryFindingsFromReportJson({})).toBeUndefined();
    expect(
      resolveAdvisoryFindingsFromReportJson({
        findings: { severity: "P2", title: "not-an-array" }
      } as unknown as Record<string, unknown>)
    ).toBeUndefined();
  });
});

describe("reviewer same-round snapshot helpers", () => {
  it("prefers metadata advisory open total over explicit empty findings list", () => {
    const snapshot = resolveSameRoundReviewerSnapshotFromEnvelope({
      id: "msg_conv_latest_01",
      ts: "2026-03-28T10:00:00.000Z",
      bubble_id: "b_meta_snapshot_01",
      sender: "claude",
      recipient: "orchestrator",
      type: "CONVERGENCE",
      round: 4,
      payload: {
        summary: "Converged.",
        findings: [],
        metadata: {
          advisory_findings_open_total: 2
        }
      },
      refs: []
    });

    expect(snapshot).toMatchObject({
      envelopeId: "msg_conv_latest_01",
      round: 4,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_open_total: 2,
      advisoryFindings: []
    });
  });

  it("returns the latest same-round reviewer snapshot and ignores older or cross-round entries", () => {
    const snapshot = resolveLatestSameRoundReviewerSnapshot(
      [
        {
          id: "msg_conv_round3_old",
          ts: "2026-03-28T09:55:00.000Z",
          bubble_id: "b_meta_snapshot_02",
          sender: "claude",
          recipient: "orchestrator",
          type: "CONVERGENCE",
          round: 3,
          payload: {
            summary: "Older round.",
            metadata: {
              advisory_findings_open_total: 3
            }
          },
          refs: []
        },
        {
          id: "msg_conv_round4_old",
          ts: "2026-03-28T09:56:00.000Z",
          bubble_id: "b_meta_snapshot_02",
          sender: "claude",
          recipient: "orchestrator",
          type: "CONVERGENCE",
          round: 4,
          payload: {
            summary: "Older same round.",
            metadata: {
              advisory_findings_open_total: 2
            }
          },
          refs: []
        },
        {
          id: "msg_conv_round4_latest",
          ts: "2026-03-28T09:57:00.000Z",
          bubble_id: "b_meta_snapshot_02",
          sender: "claude",
          recipient: "orchestrator",
          type: "CONVERGENCE",
          round: 4,
          payload: {
            summary: "Latest same round.",
            findings: []
          },
          refs: []
        }
      ],
      4
    );

    expect(snapshot).toMatchObject({
      envelopeId: "msg_conv_round4_latest",
      findings_open_total: 0
    });
  });
});
