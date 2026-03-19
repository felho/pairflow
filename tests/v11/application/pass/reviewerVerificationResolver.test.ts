import { describe, expect, it } from "vitest";

import {
  ReviewVerificationError,
  type ReviewVerificationInputResolution
} from "../../../../src/core/reviewer/reviewVerification.js";
import { resolveReviewerVerification } from "../../../../src/v11/application/pass/reviewerVerificationResolver.js";

class TestReviewerVerificationResolverError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestReviewerVerificationResolverError";
  }
}

function createError(message: string): Error {
  return new TestReviewerVerificationResolverError(message);
}

function buildResolution(): ReviewVerificationInputResolution {
  return {
    inputRef: ".pairflow/review-verification-input.json",
    resolvedPath: "/tmp/review-verification-input.json",
    payload: {
      schema: "review_verification_v1",
      overall: "pass",
      claims: [
        {
          claim_id: "C1",
          status: "verified",
          evidence_refs: ["src/a.ts:10"]
        }
      ]
    }
  };
}

describe("resolveReviewerVerification", () => {
  it("returns undefined when accuracy-critical mode is disabled", async () => {
    const resolved = await resolveReviewerVerification({
      accuracyCritical: false,
      senderRole: "reviewer",
      refs: [],
      worktreePath: "/tmp/worktree",
      createError
    });

    expect(resolved).toBeUndefined();
  });

  it("returns undefined when sender is not reviewer", async () => {
    const resolved = await resolveReviewerVerification({
      accuracyCritical: true,
      senderRole: "implementer",
      refs: [],
      worktreePath: "/tmp/worktree",
      createError
    });

    expect(resolved).toBeUndefined();
  });

  it("resolves verification input when guard conditions are met", async () => {
    const expected = buildResolution();
    const resolved = await resolveReviewerVerification({
      accuracyCritical: true,
      senderRole: "reviewer",
      refs: ["review-verification-input.json"],
      worktreePath: "/tmp/worktree",
      createError,
      resolveInputFromRefs: async () => expected
    });

    expect(resolved).toEqual(expected);
  });

  it("wraps ReviewVerificationError via createError", async () => {
    await expect(
      resolveReviewerVerification({
        accuracyCritical: true,
        senderRole: "reviewer",
        refs: ["review-verification-input.json"],
        worktreePath: "/tmp/worktree",
        createError,
        resolveInputFromRefs: async () => {
          throw new ReviewVerificationError(
            "INVALID_REVIEW_VERIFICATION_INPUT",
            "invalid verification payload"
          );
        }
      })
    ).rejects.toThrowError(
      new TestReviewerVerificationResolverError("invalid verification payload")
    );
  });

  it("rethrows non-review-verification errors unchanged", async () => {
    const unexpected = new Error("unexpected downstream failure");
    await expect(
      resolveReviewerVerification({
        accuracyCritical: true,
        senderRole: "reviewer",
        refs: ["review-verification-input.json"],
        worktreePath: "/tmp/worktree",
        createError,
        resolveInputFromRefs: async () => {
          throw unexpected;
        }
      })
    ).rejects.toBe(unexpected);
  });
});
