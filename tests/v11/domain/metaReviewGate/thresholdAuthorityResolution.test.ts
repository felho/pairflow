import { describe, expect, it } from "vitest";

import {
  buildThresholdAuthorityIncomplete,
  buildThresholdAuthorityUnresolved,
  prefixThresholdAuthorityDiagnostic,
  REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE,
  REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED
} from "../../../../src/v11/domain/metaReviewGate/thresholdAuthorityResolution.js";
import type { FindingsParityMetadata } from "../../../../src/v11/shared/metaReviewGate/findingsParityMetadataContract.js";

function createParityMetadata(): FindingsParityMetadata {
  return {
    findings_claimed_open_total: 2,
    findings_artifact_open_total: 2,
    findings_blocking_open_total: 1,
    findings_advisory_open_total: 1,
    findings_artifact_status: "available",
    findings_digest_sha256: "digest",
    meta_review_run_id: "run-threshold-1",
    findings_parity_status: "ok"
  };
}

describe("threshold authority resolution language", () => {
  it("prefixes diagnostics with threshold reason code", () => {
    expect(
      prefixThresholdAuthorityDiagnostic(
        REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
        "artifact ref is missing."
      )
    ).toBe(
      "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED: artifact ref is missing."
    );
  });

  it("builds unresolved threshold authority without synthesizing severity", () => {
    const parityMetadata = createParityMetadata();

    expect(
      buildThresholdAuthorityUnresolved({
        parityMetadata,
        diagnostics: [
          prefixThresholdAuthorityDiagnostic(
            REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
            "artifact ref is missing."
          )
        ],
        artifactRef: null,
        metaReviewRunId: "run-threshold-1",
        findingsBlockingOpenTotal: 1,
        findingsAdvisoryOpenTotal: 1
      })
    ).toEqual({
      status: "unresolved",
      parityMetadata,
      diagnostics: [
        "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED: artifact ref is missing."
      ],
      highestOpenSeverity: null,
      artifactRef: null,
      metaReviewRunId: "run-threshold-1",
      findingsBlockingOpenTotal: 1,
      findingsAdvisoryOpenTotal: 1
    });
  });

  it("builds incomplete threshold authority with canonical incomplete diagnostic", () => {
    const parityMetadata = createParityMetadata();

    expect(
      buildThresholdAuthorityIncomplete({
        parityMetadata,
        artifactRef: "artifacts/findings.json",
        metaReviewRunId: "run-threshold-1",
        findingsBlockingOpenTotal: 0,
        findingsAdvisoryOpenTotal: 0
      })
    ).toEqual({
      status: "incomplete",
      parityMetadata,
      diagnostics: [
        `${REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE}: findings artifact does not expose a resolvable open severity.`
      ],
      highestOpenSeverity: null,
      artifactRef: "artifacts/findings.json",
      metaReviewRunId: "run-threshold-1",
      findingsBlockingOpenTotal: 0,
      findingsAdvisoryOpenTotal: 0
    });
  });
});
