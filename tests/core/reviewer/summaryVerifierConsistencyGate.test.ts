import { describe, expect, it } from "vitest";

import {
  evaluateSummaryVerifierConsistencyGate,
  type SummaryVerifierConsistencyGateDecisionRecord
} from "../../../src/core/reviewer/summaryVerifierConsistencyGate.js";

function expectAuditShape(record: SummaryVerifierConsistencyGateDecisionRecord): void {
  expect(record).toHaveProperty("gate_decision");
  expect(record).toHaveProperty("reason_code");
  expect(record).toHaveProperty("review_artifact_type");
  expect(record).toHaveProperty("verifier_status");
  expect(record).toHaveProperty("claim_classes_detected");
  expect(record).toHaveProperty("matched_claim_triggers");
}

describe("evaluateSummaryVerifierConsistencyGate", () => {
  it("allows docs-only summary with positive test claim when verifier is trusted", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary: "Validation: tests pass.",
      reviewArtifactType: "document",
      verifierStatus: "trusted"
    });

    expect(decision.gate_decision).toBe("allow");
    expect(decision.reason_code).toBe("claim_verified");
    expect(decision.claim_classes_detected).toBe("test");
    expect(decision.matched_claim_triggers).toEqual(["tests pass"]);
    expect(decision.verifier_status).toBe("trusted");
    expect(decision).not.toHaveProperty("verifier_origin_reason");
  });

  it("allows docs-only summary with pnpm test clean trigger variant when verifier is trusted", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary: "Validation: pnpm test clean.",
      reviewArtifactType: "document",
      verifierStatus: "trusted"
    });

    expect(decision.gate_decision).toBe("allow");
    expect(decision.reason_code).toBe("claim_verified");
    expect(decision.review_artifact_type).toBe("document");
    expect(decision.verifier_status).toBe("trusted");
    expect(decision.claim_classes_detected).toBe("test");
    expect(decision.matched_claim_triggers).toEqual(["pnpm test clean"]);
  });

  it("allows dedicated lint-only docs-only summary when verifier is trusted", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary: "Validation run: pnpm lint clean.",
      reviewArtifactType: "document",
      verifierStatus: "trusted"
    });

    expect(decision.gate_decision).toBe("allow");
    expect(decision.reason_code).toBe("claim_verified");
    expect(decision.claim_classes_detected).toBe("lint");
    expect(decision.matched_claim_triggers.length).toBeGreaterThan(0);
    expect(decision.matched_claim_triggers.every((trigger) => trigger === trigger.toLowerCase()))
      .toBe(true);
    expect(decision.verifier_status).toBe("trusted");
  });

  it("allows docs-only summary with typecheck and lint claims in stable class order", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary: "pnpm lint clean then tsc --noEmit pass.",
      reviewArtifactType: "document",
      verifierStatus: "trusted"
    });

    expect(decision.gate_decision).toBe("allow");
    expect(decision.reason_code).toBe("claim_verified");
    expect(decision.claim_classes_detected).toBe("typecheck,lint");
    expect(decision.matched_claim_triggers).toEqual([
      "tsc --noemit pass",
      "pnpm lint clean",
      "lint clean"
    ]);
    expect(decision.verifier_status).toBe("trusted");
  });

  it("blocks docs-only summary with positive claims when verifier is untrusted", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass and lint clean",
      reviewArtifactType: "document",
      verifierStatus: "untrusted",
      verifierOriginReason: "evidence_missing"
    });

    expect(decision.gate_decision).toBe("block");
    expect(decision.reason_code).toBe("summary_verifier_mismatch");
    expect(decision.review_artifact_type).toBe("document");
    expect(decision.claim_classes_detected).toBe("test,lint");
    expect(decision.matched_claim_triggers).toEqual(["tests pass", "lint clean"]);
    expect(decision.verifier_status).toBe("untrusted");
    expect(decision.verifier_origin_reason).toBe("evidence_missing");
  });

  it("normalizes missing/invalid verifier statuses to untrusted and blocks positive claims", () => {
    const missingDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass",
      reviewArtifactType: "document",
      verifierStatus: "missing"
    });
    const invalidDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass",
      reviewArtifactType: "document",
      verifierStatus: "invalid",
      verifierOriginReason: ""
    });

    expect(missingDecision.gate_decision).toBe("block");
    expect(missingDecision.verifier_status).toBe("untrusted");
    expect(missingDecision.verifier_origin_reason).toBe("unknown");
    expect(invalidDecision.gate_decision).toBe("block");
    expect(invalidDecision.verifier_status).toBe("untrusted");
    expect(invalidDecision.verifier_origin_reason).toBe("unknown");
  });

  it("allows claim-free docs-only summaries regardless of verifier status", () => {
    const trustedDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "runtime checks not required",
      reviewArtifactType: "document",
      verifierStatus: "trusted"
    });
    const untrustedDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "runtime checks not required",
      reviewArtifactType: "document",
      verifierStatus: "untrusted",
      verifierOriginReason: "evidence_unverifiable"
    });
    const emptyDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "   ",
      reviewArtifactType: "document",
      verifierStatus: "untrusted"
    });

    expect(trustedDecision.gate_decision).toBe("allow");
    expect(untrustedDecision.gate_decision).toBe("allow");
    expect(emptyDecision.gate_decision).toBe("allow");
    expect(trustedDecision.reason_code).toBe("no_claim_in_docs_only");
    expect(untrustedDecision.reason_code).toBe("no_claim_in_docs_only");
    expect(emptyDecision.reason_code).toBe("no_claim_in_docs_only");
    expect(trustedDecision.review_artifact_type).toBe("document");
    expect(untrustedDecision.review_artifact_type).toBe("document");
    expect(emptyDecision.review_artifact_type).toBe("document");
    expect(trustedDecision.verifier_status).toBe("trusted");
    expect(untrustedDecision.verifier_status).toBe("untrusted");
    expect(emptyDecision.verifier_status).toBe("untrusted");
    expect(trustedDecision.claim_classes_detected).toBe("none");
    expect(untrustedDecision.claim_classes_detected).toBe("none");
    expect(emptyDecision.claim_classes_detected).toBe("none");
    expect(trustedDecision.matched_claim_triggers).toEqual([]);
    expect(untrustedDecision.matched_claim_triggers).toEqual([]);
    expect(emptyDecision.matched_claim_triggers).toEqual([]);
    expect(untrustedDecision).not.toHaveProperty("verifier_origin_reason");
  });

  it("rejects false-positive claim detection for unlisted phrase variant", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary: "Validation note: tests succeeded.",
      reviewArtifactType: "document",
      verifierStatus: "untrusted"
    });

    expect(decision.gate_decision).toBe("allow");
    expect(decision.reason_code).toBe("no_claim_in_docs_only");
    expect(decision.claim_classes_detected).toBe("none");
    expect(decision.matched_claim_triggers).toEqual([]);
  });

  it("returns not_applicable for code and auto artifact types and bypasses claim detection", () => {
    const codeDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass and typecheck clean",
      reviewArtifactType: "code",
      verifierStatus: "untrusted"
    });
    const autoDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass and typecheck clean",
      reviewArtifactType: "auto",
      verifierStatus: "trusted"
    });
    const invalidDecision = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass",
      reviewArtifactType: "slides",
      verifierStatus: "trusted"
    });

    for (const decision of [codeDecision, autoDecision, invalidDecision]) {
      expect(decision.gate_decision).toBe("not_applicable");
      expect(decision.reason_code).toBe("not_applicable_non_docs");
      expect(decision.claim_classes_detected).toBe("none");
      expect(decision.matched_claim_triggers).toEqual([]);
      expect(decision).not.toHaveProperty("verifier_origin_reason");
    }
    expect(invalidDecision.review_artifact_type).toBe("auto");
  });

  it("keeps decision matrix invariant under rollback Toggle A/B simulation fixture", () => {
    for (const docsOnlyRuntimeCheckRequired of [false, true] as const) {
      const fixtureSuffix = docsOnlyRuntimeCheckRequired ? "rollback_on" : "rollback_off";

      const docsClaimMismatch = evaluateSummaryVerifierConsistencyGate({
        summary: `tests pass (${fixtureSuffix})`,
        reviewArtifactType: "document",
        verifierStatus: "untrusted"
      });
      expect(docsClaimMismatch.gate_decision).toBe("block");
      expect(docsClaimMismatch.reason_code).toBe("summary_verifier_mismatch");

      const docsClaimFree = evaluateSummaryVerifierConsistencyGate({
        summary: `runtime checks not required (${fixtureSuffix})`,
        reviewArtifactType: "document",
        verifierStatus: "untrusted"
      });
      expect(docsClaimFree.gate_decision).toBe("allow");
      expect(docsClaimFree.reason_code).toBe("no_claim_in_docs_only");

      const codeNotApplicable = evaluateSummaryVerifierConsistencyGate({
        summary: `tests pass (${fixtureSuffix})`,
        reviewArtifactType: "code",
        verifierStatus: "trusted"
      });
      const autoNotApplicable = evaluateSummaryVerifierConsistencyGate({
        summary: `tests pass (${fixtureSuffix})`,
        reviewArtifactType: "auto",
        verifierStatus: "trusted"
      });
      expect(codeNotApplicable.gate_decision).toBe("not_applicable");
      expect(codeNotApplicable.reason_code).toBe("not_applicable_non_docs");
      expect(autoNotApplicable.gate_decision).toBe("not_applicable");
      expect(autoNotApplicable.reason_code).toBe("not_applicable_non_docs");
    }
  });

  it("matches triggers with case-insensitive, whitespace-normalized, punctuation boundary semantics", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary:
        "Validation: Tests   Pass, then pnpm TYPECHECK pass/ and pnpm lint clean- complete. contests pass should not match.",
      reviewArtifactType: "document",
      verifierStatus: "trusted"
    });

    expect(decision.gate_decision).toBe("allow");
    expect(decision.reason_code).toBe("claim_verified");
    expect(decision.claim_classes_detected).toBe("test,typecheck,lint");
    expect(decision.matched_claim_triggers).toEqual([
      "tests pass",
      "pnpm typecheck pass",
      "pnpm lint clean",
      "lint clean"
    ]);
  });

  it("deduplicates repeated identical triggers while preserving same-class distinct triggers", () => {
    const decision = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass and tests pass, then test pass too.",
      reviewArtifactType: "document",
      verifierStatus: "trusted"
    });

    expect(decision.gate_decision).toBe("allow");
    expect(decision.claim_classes_detected).toBe("test");
    expect(decision.matched_claim_triggers).toEqual(["tests pass", "test pass"]);
  });

  it("keeps closed reason-code set and mandatory audit keys for every output branch", () => {
    const outputs = [
      evaluateSummaryVerifierConsistencyGate({
        summary: "tests pass",
        reviewArtifactType: "document",
        verifierStatus: "trusted"
      }),
      evaluateSummaryVerifierConsistencyGate({
        summary: "tests pass",
        reviewArtifactType: "document",
        verifierStatus: "untrusted",
        verifierOriginReason: "evidence_missing"
      }),
      evaluateSummaryVerifierConsistencyGate({
        summary: "runtime checks not required",
        reviewArtifactType: "document",
        verifierStatus: "untrusted"
      }),
      evaluateSummaryVerifierConsistencyGate({
        summary: "tests pass",
        reviewArtifactType: "auto",
        verifierStatus: "trusted"
      })
    ];
    const allowedReasonCodes = new Set([
      "claim_verified",
      "no_claim_in_docs_only",
      "summary_verifier_mismatch",
      "not_applicable_non_docs"
    ]);

    for (const output of outputs) {
      expectAuditShape(output);
      expect(allowedReasonCodes.has(output.reason_code)).toBe(true);
    }
  });

  it("does not allow nested reason_detail object in canonical decision output shape", () => {
    const output = evaluateSummaryVerifierConsistencyGate({
      summary: "tests pass and lint clean",
      reviewArtifactType: "document",
      verifierStatus: "untrusted",
      verifierOriginReason: "evidence_missing"
    }) as unknown as Record<string, unknown>;

    expect("reason_detail" in output).toBe(false);
    expect(output).not.toHaveProperty("reason_detail");
  });
});
