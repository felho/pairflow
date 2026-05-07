import { describe, expect, it } from "vitest";

import {
  metaReviewApproveClaimsOpenFindings,
  metaReviewApproveThresholdBlockedReasonCode,
  metaReviewApproveThresholdContextUnresolvedReasonCode,
  resolveMetaReviewSubmitApproveThresholdPolicy
} from "../../../../src/v11/domain/metaReviewGate/approveSubmitThresholdPolicy.js";
import {
  metaReviewGateThresholdIsMet,
  resolveVerifiedThresholdAuthority
} from "../../../../src/v11/domain/metaReviewGate/thresholdAuthority.js";

describe("threshold authority domain policy", () => {
  it("resolves highest open severity and verified split totals from artifact findings", () => {
    const resolution = resolveVerifiedThresholdAuthority({
      findings: [
        { severity: "P2", title: "advisory" },
        { severity: "P1", title: "blocking" }
      ],
      findingsCount: 2,
      artifactOpenTotal: 2,
      artifactStatus: "present",
      digest: "a".repeat(64),
      artifactRef: "artifacts/findings.json",
      metaReviewRunId: "run_threshold_authority_domain_01",
      artifactSplit: {
        blockingOpenTotal: 1,
        advisoryOpenTotal: 1
      }
    });

    expect(resolution).toMatchObject({
      status: "resolved",
      highestOpenSeverity: "P1",
      artifactRef: "artifacts/findings.json",
      metaReviewRunId: "run_threshold_authority_domain_01",
      findingsBlockingOpenTotal: 1,
      findingsAdvisoryOpenTotal: 1,
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: 2,
        findings_blocking_open_total: 1,
        findings_advisory_open_total: 1,
        findings_parity_status: "ok"
      }
    });
  });

  it("fails closed as incomplete when verified findings do not expose severity", () => {
    const resolution = resolveVerifiedThresholdAuthority({
      findings: [{ title: "missing severity" }],
      findingsCount: 1,
      artifactOpenTotal: 1,
      artifactStatus: "present",
      digest: "b".repeat(64),
      artifactRef: "artifacts/findings.json",
      metaReviewRunId: "run_threshold_authority_domain_02",
      artifactSplit: {
        blockingOpenTotal: 0,
        advisoryOpenTotal: 0
      }
    });

    expect(resolution).toMatchObject({
      status: "incomplete",
      highestOpenSeverity: null,
      findingsBlockingOpenTotal: 0,
      findingsAdvisoryOpenTotal: 0
    });
    expect(resolution.diagnostics[0]).toContain(
      "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE"
    );
  });

  it("compares severities against the configured threshold", () => {
    expect(
      metaReviewGateThresholdIsMet({
        highestOpenSeverity: "P1",
        minSeverity: "P2"
      })
    ).toBe(true);
    expect(
      metaReviewGateThresholdIsMet({
        highestOpenSeverity: "P3",
        minSeverity: "P2"
      })
    ).toBe(false);
  });

  it("detects open-findings approve claims from canonical report fields", () => {
    expect(
      metaReviewApproveClaimsOpenFindings({
        findings_claim_state: "open_findings"
      })
    ).toBe(true);
    expect(
      metaReviewApproveClaimsOpenFindings({
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 1
      })
    ).toBe(true);
    expect(
      metaReviewApproveClaimsOpenFindings({
        findings_claimed_open_total: 0
      })
    ).toBe(false);
  });

  it("keeps submit approve threshold policy in the gate domain", () => {
    expect(
      resolveMetaReviewSubmitApproveThresholdPolicy({
        recommendation: "approve",
        reportJson: {
          findings_claim_state: "open_findings"
        },
        minSeverity: "P3",
        thresholdAuthority: null
      })
    ).toMatchObject({
      accepted: false,
      reasonCode: metaReviewApproveThresholdContextUnresolvedReasonCode,
      reason: "approve_open_findings_threshold_authority_unresolved",
      thresholdStatus: "missing"
    });

    expect(
      resolveMetaReviewSubmitApproveThresholdPolicy({
        recommendation: "approve",
        reportJson: {
          findings_claim_state: "open_findings"
        },
        minSeverity: "P3",
        thresholdAuthority: {
          status: "resolved",
          diagnostics: [],
          parityMetadata: null,
          highestOpenSeverity: "P2",
          artifactRef: "artifacts/findings.json",
          metaReviewRunId: "run_threshold_policy_domain_01",
          findingsBlockingOpenTotal: 1,
          findingsAdvisoryOpenTotal: 0
        }
      })
    ).toMatchObject({
      accepted: false,
      reasonCode: metaReviewApproveThresholdBlockedReasonCode,
      reason: "approve_open_findings_threshold_met",
      highestOpenSeverity: "P2"
    });

    expect(
      resolveMetaReviewSubmitApproveThresholdPolicy({
        recommendation: "approve",
        reportJson: {
          findings_claim_state: "open_findings"
        },
        minSeverity: "P2",
        thresholdAuthority: {
          status: "resolved",
          diagnostics: [],
          parityMetadata: null,
          highestOpenSeverity: "P3",
          artifactRef: "artifacts/findings.json",
          metaReviewRunId: "run_threshold_policy_domain_02",
          findingsBlockingOpenTotal: 0,
          findingsAdvisoryOpenTotal: 1
        }
      })
    ).toEqual({ accepted: true });
  });
});
