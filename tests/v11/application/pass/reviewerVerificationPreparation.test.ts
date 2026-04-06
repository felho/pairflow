import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  REVIEW_VERIFICATION_SCHEMA,
  type ReviewVerificationInputResolution
} from "../../../../src/v11/shared/reviewer/reviewVerification.js";
import { prepareReviewerVerification } from "../../../../src/v11/application/pass/reviewerVerificationPreparation.js";

describe("prepareReviewerVerification", () => {
  it("runs docs-only guard, resolves verification, then applies consistency guard", async () => {
    const callOrder: string[] = [];
    const resolvedVerification: ReviewVerificationInputResolution = {
      inputRef: ".pairflow/evidence/review-verification-input.json",
      resolvedPath: "/tmp/review-verification-input.json",
      payload: {
        schema: REVIEW_VERIFICATION_SCHEMA as typeof REVIEW_VERIFICATION_SCHEMA,
        overall: "fail" as const,
        claims: []
      }
    };

    const result = await prepareReviewerVerification(
      {
        reviewArtifactType: "document",
        senderRole: "reviewer",
        summary: "handoff",
        refs: [".pairflow/evidence/review-verification-input.json"],
        accuracyCritical: true,
        worktreePath: "/tmp/worktree",
        intent: "fix_request",
        hasFindings: true,
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        assertNoDocsOnlySkipLogRefConflict: () => {
          callOrder.push("docs-guard");
        },
        resolveReviewerVerification: async () => {
          callOrder.push("resolve");
          return resolvedVerification;
        },
        validateReviewerVerificationConsistency: (input) => {
          callOrder.push("consistency");
          expect(input.payloadOverall).toBe("fail");
          expect(input.intent).toBe("fix_request");
          expect(input.hasFindings).toBe(true);
        }
      }
    );

    expect(callOrder).toEqual(["docs-guard", "resolve", "consistency"]);
    expect(result).toEqual(resolvedVerification);
  });

  it("skips consistency guard when verification is undefined", async () => {
    let consistencyCalled = false;

    const result = await prepareReviewerVerification(
      {
        reviewArtifactType: "code",
        senderRole: "implementer",
        summary: "handoff",
        refs: [],
        accuracyCritical: false,
        worktreePath: "/tmp/worktree",
        intent: "review",
        hasFindings: false,
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        assertNoDocsOnlySkipLogRefConflict: () => undefined,
        resolveReviewerVerification: async () => undefined,
        validateReviewerVerificationConsistency: () => {
          consistencyCalled = true;
        }
      }
    );

    expect(result).toBeUndefined();
    expect(consistencyCalled).toBe(false);
  });

  it("propagates docs-only guard errors before resolver execution", async () => {
    let resolverCalled = false;

    await expect(() =>
      prepareReviewerVerification(
        {
          reviewArtifactType: "document",
          senderRole: "implementer",
          summary: "runtime checks intentionally not executed",
          refs: [".pairflow/evidence/test.log"],
          accuracyCritical: false,
          worktreePath: "/tmp/worktree",
          intent: "review",
          hasFindings: false,
          createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
        },
        {
          assertNoDocsOnlySkipLogRefConflict: () => {
            throw new Error("DOCS_ONLY_SKIP_LOG_REF_CONFLICT");
          },
          resolveReviewerVerification: async () => {
            resolverCalled = true;
            return undefined;
          }
        }
      )
    ).rejects.toThrow("DOCS_ONLY_SKIP_LOG_REF_CONFLICT");

    expect(resolverCalled).toBe(false);
  });

  it("throws when resolver dependency is missing", async () => {
    await expect(() =>
      prepareReviewerVerification({
        reviewArtifactType: "code",
        senderRole: "implementer",
        summary: "handoff",
        refs: [],
        accuracyCritical: false,
        worktreePath: "/tmp/worktree",
        intent: "review",
        hasFindings: false,
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      })
    ).rejects.toThrow("Reviewer verification resolver dependency is required for preparation.");
  });
});
