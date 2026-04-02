import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  deriveFindingsOpenSplit,
  validateFindingsArtifactParity
} from "../../../../src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.js";

describe("deriveFindingsOpenSplit", () => {
  it("derives blocking and advisory totals from mixed findings", () => {
    const split = deriveFindingsOpenSplit([
      {
        severity: "P0",
        title: "blocking-0"
      },
      {
        priority: "P1",
        title: "blocking-1"
      },
      {
        severity: "blocking",
        title: "blocking-alias"
      },
      {
        severity: "advisory",
        title: "advisory-alias"
      },
      {
        severity: "P2",
        title: "advisory-2"
      },
      {
        priority: "P3",
        title: "advisory-3"
      },
      {
        title: "invalid-missing-priority"
      }
    ]);

    expect(split).toEqual({
      blockingOpenTotal: 3,
      advisoryOpenTotal: 3
    });
  });

  it("returns null for non-array input", () => {
    const split = deriveFindingsOpenSplit({
      severity: "P2",
      title: "not-array"
    });

    expect(split).toBeNull();
  });

  it("keeps advisory/blocking split populated on artifact parity mismatch path", async () => {
    const rawArtifact = JSON.stringify({
      open_total: 1,
      findings: [
        { severity: "P2", title: "advisory-a" },
        { severity: "P1", title: "blocking-a" }
      ]
    });
    const digest = createHash("sha256")
      .update(rawArtifact, "utf8")
      .digest("hex");
    const result = await validateFindingsArtifactParity({
      artifactPath: "/tmp/rework-findings.json",
      findingsCount: 2,
      digest,
      artifactStatus: "available",
      metaReviewRunId: "run_split_mismatch_01",
      readFileFn: (async () =>
        Buffer.from(rawArtifact, "utf8")) as never
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toContain("META_REVIEW_FINDINGS_COUNT_MISMATCH");
    expect(result.metadata).toMatchObject({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 1
    });
  });

  it("keeps advisory/blocking split populated on digest-mismatch guard path", async () => {
    const rawArtifact = JSON.stringify({
      open_total: 2,
      findings: [
        { severity: "P2", title: "advisory-a" },
        { severity: "P2", title: "advisory-b" }
      ]
    });
    const result = await validateFindingsArtifactParity({
      artifactPath: "/tmp/rework-findings.json",
      findingsCount: 2,
      digest: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      artifactStatus: "available",
      metaReviewRunId: "run_split_digest_mismatch_01",
      readFileFn: (async () =>
        Buffer.from(rawArtifact, "utf8")) as never
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toContain("META_REVIEW_FINDINGS_PARITY_GUARD");
    expect(result.reason).toContain("digest mismatch");
    expect(result.metadata).toMatchObject({
      findings_artifact_open_total: 2,
      findings_parity_status: "guard_failed",
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });
  });

  it("uses null split on pre-parse guard-failed paths", async () => {
    const result = await validateFindingsArtifactParity({
      artifactPath: "/tmp/rework-findings.json",
      findingsCount: 2,
      digest: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      artifactStatus: "available",
      metaReviewRunId: "run_split_preparse_01",
      readFileFn: (async () => {
        throw new Error("simulated read failure");
      }) as never
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.metadata).toMatchObject({
      findings_blocking_open_total: null,
      findings_advisory_open_total: null
    });
  });
});
