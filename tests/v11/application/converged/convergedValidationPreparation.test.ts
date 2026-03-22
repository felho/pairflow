import { describe, expect, it } from "vitest";

import { prepareConvergedValidation } from "../../../../src/v11/application/converged/convergedValidationPreparation.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("prepareConvergedValidation", () => {
  it("returns default doc-gate states when artifact read fails and persists summary/verifier audit", async () => {
    let writerCalled = false;

    const result = await prepareConvergedValidation(
      {
        resolved: {
          bubbleId: "b_val_001",
          bubbleConfig: {
            review_artifact_type: "document",
            accuracy_critical: false
          },
          bubblePaths: {
            artifactsDir: "/tmp/artifacts",
            worktreePath: "/tmp/worktree",
            reviewVerificationArtifactPath: "/tmp/review-verification.json"
          }
        } as never,
        state: {
          round: 4
        } as never,
        reviewer: "claude",
        summary: "No runtime claims.",
        nowIso: "2026-03-19T19:00:00.000Z",
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        isDocContractGateScopeActive: () => true,
        readDocContractGateArtifact: async () => {
          throw new Error("gate artifact unreadable");
        },
        resolveDocContractGateArtifactPath: () => "/tmp/artifacts/doc-contract-gate.json",
        resolveReviewerTestExecutionDirective: async () => ({
          skip_full_rerun: false,
          reason_code: "evidence_verified",
          reason_detail: "ok",
          verification_status: "trusted"
        }) as never,
        resolveReviewerTestEvidenceArtifactPath: () => "/tmp/artifacts/reviewer-test-evidence.json",
        evaluateSummaryVerifierConsistencyGate: () => ({
          gate_decision: "allow",
          reason_code: "no_claim_in_docs_only",
          review_artifact_type: "document",
          verifier_status: "trusted",
          claim_classes_detected: "none",
          matched_claim_triggers: []
        }),
        resolveSummaryVerifierConsistencyGateArtifactPath: () =>
          "/tmp/artifacts/summary-verifier-consistency-gate.json",
        writeSummaryVerifierConsistencyGateArtifact: async (path, artifact) => {
          writerCalled = true;
          expect(path).toBe("/tmp/artifacts/summary-verifier-consistency-gate.json");
          expect(artifact.bubble_id).toBe("b_val_001");
          expect(artifact.round).toBe(4);
          expect(artifact.evaluated_at).toBe("2026-03-19T19:00:00.000Z");
        }
      }
    );

    expect(writerCalled).toBe(true);
    expect(result).toEqual({
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 4
      },
      docGateArtifactReadFailureReason: "gate artifact unreadable",
      summaryVerifierGateDecision: {
        gate_decision: "allow",
        reason_code: "no_claim_in_docs_only",
        review_artifact_type: "document",
        verifier_status: "trusted",
        claim_classes_detected: "none",
        matched_claim_triggers: []
      }
    });
  });

  it("rejects convergence when accuracy-critical verification is not pass", async () => {
    await expect(
      prepareConvergedValidation(
        {
          resolved: {
            bubbleId: "b_val_002",
            bubbleConfig: {
              review_artifact_type: "code",
              accuracy_critical: true
            },
            bubblePaths: {
              artifactsDir: "/tmp/artifacts",
              worktreePath: "/tmp/worktree",
              reviewVerificationArtifactPath: "/tmp/review-verification.json"
            }
          } as never,
          state: {
            round: 2
          } as never,
          reviewer: "claude",
          summary: "summary",
          nowIso: "2026-03-19T19:05:00.000Z",
          createError: (input) => new Error(toErrorMessage(input))
        },
        {
          isDocContractGateScopeActive: () => false,
          readReviewVerificationArtifactStatus: async () => ({
            status: "fail"
          }) as never,
          resolveReviewerTestExecutionDirective: async () => ({
            skip_full_rerun: false,
            reason_code: "evidence_verified",
            reason_detail: "ok",
            verification_status: "trusted"
          }) as never,
          resolveReviewerTestEvidenceArtifactPath: () => "/tmp/artifacts/reviewer-test-evidence.json",
          evaluateSummaryVerifierConsistencyGate: () => ({
            gate_decision: "not_applicable",
            reason_code: "not_applicable_non_docs",
            review_artifact_type: "code",
            verifier_status: "trusted",
            claim_classes_detected: "none",
            matched_claim_triggers: []
          }),
          resolveSummaryVerifierConsistencyGateArtifactPath: () =>
            "/tmp/artifacts/summary-verifier-consistency-gate.json",
          writeSummaryVerifierConsistencyGateArtifact: async () => undefined
        }
      )
    ).rejects.toThrow(
      "Convergence validation failed: accuracy-critical review verification must be pass (current: fail)."
    );
  });

  it("rejects convergence when summary/verifier decision blocks", async () => {
    await expect(
      prepareConvergedValidation(
        {
          resolved: {
            bubbleId: "b_val_003",
            bubbleConfig: {
              review_artifact_type: "document",
              accuracy_critical: false
            },
            bubblePaths: {
              artifactsDir: "/tmp/artifacts",
              worktreePath: "/tmp/worktree",
              reviewVerificationArtifactPath: "/tmp/review-verification.json"
            }
          } as never,
          state: {
            round: 5
          } as never,
          reviewer: "claude",
          summary: "tests pass and typecheck clean",
          nowIso: "2026-03-19T19:10:00.000Z",
          createError: (input) => new Error(toErrorMessage(input))
        },
        {
          isDocContractGateScopeActive: () => true,
          readDocContractGateArtifact: async () => ({
            spec_lock_state: {
              state: "IMPLEMENTABLE",
              open_blocker_count: 0,
              open_required_now_count: 0
            },
            round_gate_state: {
              applies: false,
              violated: false,
              round: 5
            }
          }) as never,
          resolveDocContractGateArtifactPath: () => "/tmp/artifacts/doc-contract-gate.json",
          resolveReviewerTestExecutionDirective: async () => ({
            skip_full_rerun: false,
            reason_code: "evidence_unverifiable",
            reason_detail: "runtime error",
            verification_status: "untrusted"
          }) as never,
          resolveReviewerTestEvidenceArtifactPath: () => "/tmp/artifacts/reviewer-test-evidence.json",
          evaluateSummaryVerifierConsistencyGate: () => ({
            gate_decision: "block",
            reason_code: "summary_verifier_mismatch",
            review_artifact_type: "document",
            verifier_status: "untrusted",
            claim_classes_detected: "test,typecheck",
            matched_claim_triggers: ["tests pass", "typecheck clean"],
            verifier_origin_reason: "evidence_unverifiable"
          }),
          resolveSummaryVerifierConsistencyGateArtifactPath: () =>
            "/tmp/artifacts/summary-verifier-consistency-gate.json",
          writeSummaryVerifierConsistencyGateArtifact: async () => undefined
        }
      )
    ).rejects.toThrow(
      /Convergence validation failed: docs-only summary\/verifier consistency gate blocked approval summary/
    );
  });
});
