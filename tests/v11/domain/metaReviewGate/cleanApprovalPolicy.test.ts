import { describe, expect, it } from "vitest";

import { resolveThresholdCleanApprovalPolicy } from "../../../../src/v11/domain/metaReviewGate/cleanApprovalPolicy.js";
import type { FindingsParityMetadata } from "../../../../src/types/protocol.js";

function createParityMetadata(
  input: Partial<FindingsParityMetadata> = {}
): FindingsParityMetadata {
  return {
    findings_artifact_open_total: 0,
    findings_artifact_status: "available",
    findings_digest_sha256: "digest",
    meta_review_run_id: "run-1",
    findings_parity_status: "ok",
    findings_claimed_open_total: 0,
    findings_blocking_open_total: 0,
    findings_advisory_open_total: 0,
    ...input
  };
}

describe("resolveThresholdCleanApprovalPolicy", () => {
  it("accepts approve results with zero claimed/blocking/advisory open findings", () => {
    expect(
      resolveThresholdCleanApprovalPolicy({
        recommendation: "approve",
        parityMetadata: createParityMetadata(),
        configuredMinSeverity: "P1"
      })
    ).toEqual({
      clean: true,
      parityMetadata: createParityMetadata()
    });
  });

  it("requires threshold authority when approve parity is not clean", () => {
    expect(
      resolveThresholdCleanApprovalPolicy({
        recommendation: "approve",
        parityMetadata: createParityMetadata({
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1
        }),
        configuredMinSeverity: "P1"
      })
    ).toEqual({
      clean: false,
      thresholdRequired: true,
      parityMetadata: createParityMetadata({
        findings_claimed_open_total: 1,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 1
      })
    });
  });

  it("rejects unresolved threshold authority with an explicit reason", () => {
    expect(
      resolveThresholdCleanApprovalPolicy({
        recommendation: "approve",
        parityMetadata: null,
        configuredMinSeverity: "P1",
        thresholdAuthority: {
          status: "incomplete",
          parityMetadata: null
        }
      })
    ).toEqual({
      clean: false,
      thresholdRequired: false,
      parityMetadata: null,
      fallbackReason:
        "META_REVIEW_GATE_CLEAN_RUN_THRESHOLD_UNRESOLVED: thresholdStatus=incomplete."
    });
  });

  it("rejects threshold-met open findings using the configured min severity", () => {
    expect(
      resolveThresholdCleanApprovalPolicy({
        recommendation: "approve",
        parityMetadata: null,
        configuredMinSeverity: "P2",
        thresholdAuthority: {
          status: "resolved",
          highestOpenSeverity: "P1",
          parityMetadata: null
        }
      })
    ).toEqual({
      clean: false,
      thresholdRequired: false,
      parityMetadata: null,
      fallbackReason:
        "META_REVIEW_GATE_CLEAN_RUN_THRESHOLD_MET: highestOpenSeverity=P1; configuredMinSeverity=P2."
    });
  });

  it("accepts below-threshold open findings as clean for final approval", () => {
    expect(
      resolveThresholdCleanApprovalPolicy({
        recommendation: "approve",
        parityMetadata: null,
        configuredMinSeverity: "P1",
        thresholdAuthority: {
          status: "resolved",
          highestOpenSeverity: "P3",
          parityMetadata: createParityMetadata({
            findings_claimed_open_total: 1,
            findings_blocking_open_total: 0,
            findings_advisory_open_total: 1
          })
        }
      })
    ).toEqual({
      clean: true,
      parityMetadata: createParityMetadata({
        findings_claimed_open_total: 1,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 1
      })
    });
  });
});
