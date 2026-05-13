import { describe, expect, it } from "vitest";

import {
  META_REVIEW_APPROVE_THRESHOLD_BACKSTOP,
  resolveApproveThresholdBackstopPolicy
} from "../../../../src/v11/domain/metaReviewGate/approveThresholdBackstopPolicy.js";
import type { FindingsParityMetadata } from "../../../../src/v11/shared/metaReviewGate/findingsParityMetadataContract.js";

function createParityMetadata(
  input: Partial<FindingsParityMetadata> = {}
): FindingsParityMetadata {
  return {
    findings_artifact_open_total: 1,
    findings_artifact_status: "available",
    findings_digest_sha256: "digest",
    meta_review_run_id: "run-1",
    findings_parity_status: "ok",
    findings_claimed_open_total: 1,
    findings_blocking_open_total: 1,
    findings_advisory_open_total: 0,
    ...input
  };
}

describe("resolveApproveThresholdBackstopPolicy", () => {
  it("does not require threshold authority for non-approve or clean approve routes", () => {
    expect(
      resolveApproveThresholdBackstopPolicy({
        recommendation: "rework",
        claimsOpenFindings: true,
        parityMetadata: null,
        configuredMinSeverity: "P1"
      })
    ).toEqual({
      blocked: false,
      thresholdRequired: false,
      parityMetadata: null
    });

    expect(
      resolveApproveThresholdBackstopPolicy({
        recommendation: "approve",
        claimsOpenFindings: false,
        parityMetadata: null,
        configuredMinSeverity: "P1"
      })
    ).toEqual({
      blocked: false,
      thresholdRequired: false,
      parityMetadata: null
    });
  });

  it("requires threshold authority for approve routes that claim open findings", () => {
    const parityMetadata = createParityMetadata();

    expect(
      resolveApproveThresholdBackstopPolicy({
        recommendation: "approve",
        claimsOpenFindings: true,
        parityMetadata,
        configuredMinSeverity: "P1"
      })
    ).toEqual({
      blocked: false,
      thresholdRequired: true,
      parityMetadata
    });
  });

  it("blocks unresolved threshold authority with a threshold status reason", () => {
    const resolution = resolveApproveThresholdBackstopPolicy({
      recommendation: "approve",
      claimsOpenFindings: true,
      parityMetadata: null,
      configuredMinSeverity: "P1",
      thresholdAuthority: {
        status: "unresolved",
        parityMetadata: null
      }
    });

    expect(resolution).toEqual({
      blocked: true,
      thresholdRequired: false,
      parityMetadata: null,
      fallbackReason:
        `${META_REVIEW_APPROVE_THRESHOLD_BACKSTOP}: invalid open-findings approve cannot route to human_gate_approve (thresholdStatus=unresolved).`
    });
  });

  it("blocks threshold-met findings with configured severity detail", () => {
    const resolution = resolveApproveThresholdBackstopPolicy({
      recommendation: "approve",
      claimsOpenFindings: true,
      parityMetadata: null,
      configuredMinSeverity: "P2",
      thresholdAuthority: {
        status: "resolved",
        highestOpenSeverity: "P1",
        parityMetadata: null
      }
    });

    expect(resolution).toEqual({
      blocked: true,
      thresholdRequired: false,
      parityMetadata: null,
      fallbackReason:
        `${META_REVIEW_APPROVE_THRESHOLD_BACKSTOP}: invalid open-findings approve cannot route to human_gate_approve (highestOpenSeverity=P1; configuredMinSeverity=P2).`
    });
  });

  it("allows below-threshold open findings to continue to human approval", () => {
    const parityMetadata = createParityMetadata({
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 1
    });
    const thresholdAuthority = {
      status: "resolved" as const,
      highestOpenSeverity: "P3" as const,
      parityMetadata
    };

    expect(
      resolveApproveThresholdBackstopPolicy({
        recommendation: "approve",
        claimsOpenFindings: true,
        parityMetadata: null,
        configuredMinSeverity: "P1",
        thresholdAuthority
      })
    ).toEqual({
      blocked: false,
      thresholdRequired: false,
      parityMetadata,
      thresholdAuthority
    });
  });
});
