import { describe, expect, it } from "vitest";

import type { Finding } from "../../../../src/types/findings.js";
import { prepareNormalPassAppend } from "../../../../src/v11/application/pass/internal/normalPass/normalPassAppendPreparation.js";

describe("prepareNormalPassAppend", () => {
  it("keeps doc-gate scope inactive for implementer sender role", () => {
    const findings: Finding[] = [{ title: "p1", priority: "P1" }];
    let evaluateCalled = false;
    const result = prepareNormalPassAppend(
      {
        senderRole: "implementer",
        reviewArtifactType: "document",
        round: 2,
        findings,
        hasFindings: true,
        roundGateAppliesAfter: 1,
        locksDir: "/tmp/locks",
        bubbleId: "b_123"
      },
      {
        isDocContractGateScopeActive: () => true,
        evaluateReviewerGateWarnings: () => {
          evaluateCalled = true;
          return {
            warnings: [],
            findingEvaluations: [],
            normalizedFindings: [],
            roundGateState: {
              applies: true,
              violated: false,
              round: 2
            },
            specLockState: {
              state: "IMPLEMENTABLE",
              open_blocker_count: 0,
              open_required_now_count: 0
            }
          };
        }
      }
    );

    expect(result.docGateScopeActive).toBe(false);
    expect(result.findingsForPayload).toEqual(findings);
    expect(result.reviewerGateEvaluation).toBeUndefined();
    expect(result.lockPath).toBe("/tmp/locks/b_123.lock");
    expect(evaluateCalled).toBe(false);
  });

  it("evaluates reviewer gate and uses normalized findings in reviewer doc scope", () => {
    const findings: Finding[] = [{ title: "raw", priority: "P1" }];
    const normalized: Finding[] = [{ title: "normalized", priority: "P2" }];
    let evaluateCalled = false;

    const result = prepareNormalPassAppend(
      {
        senderRole: "reviewer",
        reviewArtifactType: "document",
        round: 3,
        findings,
        hasFindings: true,
        roundGateAppliesAfter: 2,
        locksDir: "/tmp/locks",
        bubbleId: "b_123"
      },
      {
        isDocContractGateScopeActive: () => true,
        evaluateReviewerGateWarnings: () => {
          evaluateCalled = true;
          return {
            warnings: [],
            findingEvaluations: [],
            normalizedFindings: normalized,
            roundGateState: {
              applies: true,
              violated: false,
              round: 3
            },
            specLockState: {
              state: "IMPLEMENTABLE",
              open_blocker_count: 0,
              open_required_now_count: 0
            }
          };
        }
      }
    );

    expect(result.docGateScopeActive).toBe(true);
    expect(result.findingsForPayload).toEqual(normalized);
    expect(result.reviewerGateEvaluation?.normalizedFindings).toEqual(normalized);
    expect(evaluateCalled).toBe(true);
  });

  it("skips reviewer gate evaluation when there are no findings", () => {
    let evaluateCalled = false;
    const findings: Finding[] = [];
    const result = prepareNormalPassAppend(
      {
        senderRole: "reviewer",
        reviewArtifactType: "document",
        round: 2,
        findings,
        hasFindings: false,
        roundGateAppliesAfter: 1,
        locksDir: "/tmp/locks",
        bubbleId: "b_123"
      },
      {
        isDocContractGateScopeActive: () => true,
        evaluateReviewerGateWarnings: () => {
          evaluateCalled = true;
          return {
            warnings: [],
            findingEvaluations: [],
            normalizedFindings: [],
            roundGateState: {
              applies: false,
              violated: false,
              round: 2
            },
            specLockState: {
              state: "IMPLEMENTABLE",
              open_blocker_count: 0,
              open_required_now_count: 0
            }
          };
        }
      }
    );

    expect(result.docGateScopeActive).toBe(true);
    expect(result.findingsForPayload).toEqual(findings);
    expect(result.reviewerGateEvaluation).toBeUndefined();
    expect(evaluateCalled).toBe(false);
  });
});
