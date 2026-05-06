import { describe, expect, it } from "vitest";

import {
  buildVerifiedReworkFindingsParityValidation
} from "../../../../src/v11/domain/metaReviewGate/findingsValidationParity.js";

describe("findings validation parity domain policy", () => {
  it("builds ok metadata and displayable findings from verified rework findings", () => {
    const validation = buildVerifiedReworkFindingsParityValidation({
      summary: "Open findings remain.",
      findings: [
        {
          priority: "P1",
          title: " blocking finding ",
          refs: ["artifact://finding-a", ""]
        },
        {
          severity: "P2",
          title: "advisory finding"
        },
        {
          severity: "blocking",
          title: "alias-only severity is not payload displayable"
        }
      ],
      findingsCount: 3,
      artifactOpenTotal: 3,
      artifactStatus: "present",
      digest: "a".repeat(64),
      metaReviewRunId: "run_rework_validation_01"
    });

    expect(validation).toMatchObject({
      ok: true,
      diagnostics: [],
      metadata: {
        findings_claimed_open_total: 3,
        findings_artifact_open_total: 3,
        findings_artifact_status: "present",
        findings_digest_sha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        meta_review_run_id: "run_rework_validation_01",
        findings_parity_status: "ok"
      },
      findingsForPayload: [
        {
          priority: "P1",
          severity: "P1",
          title: "blocking finding",
          refs: ["artifact://finding-a"]
        },
        {
          severity: "P2",
          title: "advisory finding"
        }
      ]
    });
  });

  it("emits parser divergence diagnostics when summary is not open-findings", () => {
    const validation = buildVerifiedReworkFindingsParityValidation({
      summary: "No findings remain.",
      findings: [{ severity: "P1", title: "blocking finding" }],
      findingsCount: 1,
      artifactOpenTotal: 1,
      artifactStatus: "present",
      digest: "b".repeat(64),
      metaReviewRunId: "run_rework_validation_02"
    });

    expect(validation.diagnostics).toEqual([
      "CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC: parser_state=unknown structured_state=open_findings structured_source=meta_review_artifact"
    ]);
  });
});
