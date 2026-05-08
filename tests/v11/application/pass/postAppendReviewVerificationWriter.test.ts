import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  REVIEW_VERIFICATION_SCHEMA,
  type ReviewVerificationArtifact,
  type ReviewVerificationInputResolution
} from "../../../../src/v11/shared/reviewer/reviewVerification.js";
import { writePostAppendReviewVerificationArtifact } from "../../../../src/v11/application/pass/internal/verification/postAppendReviewVerificationWriter.js";

class TestPostAppendReviewVerificationWriterError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestPostAppendReviewVerificationWriterError";
  }
}

function createError(message: PairflowCommandErrorInput): Error {
  return new TestPostAppendReviewVerificationWriterError(toErrorMessage(message));
}

function buildReviewerVerification(): ReviewVerificationInputResolution {
  return {
    inputRef: "review-verification-input.json",
    resolvedPath: "/tmp/review-verification-input.json",
    payload: {
      schema: REVIEW_VERIFICATION_SCHEMA,
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

function buildArtifact(): ReviewVerificationArtifact {
  return {
    schema: REVIEW_VERIFICATION_SCHEMA,
    overall: "pass",
    claims: [
      {
        claim_id: "C1",
        status: "verified",
        evidence_refs: ["src/a.ts:10"]
      }
    ],
    input_ref: "review-verification-input.json",
    meta: {
      bubble_id: "b_123",
      round: 2,
      reviewer: "claude",
      generated_at: "2026-03-19T12:00:00.000Z"
    },
    validation: {
      status: "valid",
      errors: []
    }
  };
}

describe("writePostAppendReviewVerificationArtifact", () => {
  it("no-ops when reviewer verification is undefined", async () => {
    let writeCalled = false;
    await writePostAppendReviewVerificationArtifact(
      {
        reviewerVerification: undefined,
        bubbleId: "b_123",
        round: 2,
        reviewer: "claude",
        generatedAt: "2026-03-19T12:00:00.000Z",
        artifactPath: "/tmp/review-verification.json",
        envelopeId: "msg_1",
        createError
      },
      {
        writeReviewVerificationArtifactAtomic: async () => {
          writeCalled = true;
        }
      }
    );

    expect(writeCalled).toBe(false);
  });

  it("writes artifact when reviewer verification is present", async () => {
    const writes: Array<{ path: string; artifact: ReviewVerificationArtifact }> = [];
    await writePostAppendReviewVerificationArtifact(
      {
        reviewerVerification: buildReviewerVerification(),
        bubbleId: "b_123",
        round: 2,
        reviewer: "claude",
        generatedAt: "2026-03-19T12:00:00.000Z",
        artifactPath: "/tmp/review-verification.json",
        envelopeId: "msg_1",
        createError
      },
      {
        createReviewVerificationArtifact: () => buildArtifact(),
        writeReviewVerificationArtifactAtomic: async (path, artifact) => {
          writes.push({ path, artifact });
        }
      }
    );

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      path: "/tmp/review-verification.json"
    });
    expect(writes[0]?.artifact.meta.round).toBe(2);
    expect(writes[0]?.artifact.meta.reviewer).toBe("claude");
  });

  it("wraps write failure with post-append failure message", async () => {
    await expect(
      writePostAppendReviewVerificationArtifact(
        {
          reviewerVerification: buildReviewerVerification(),
          bubbleId: "b_123",
          round: 2,
          reviewer: "claude",
          generatedAt: "2026-03-19T12:00:00.000Z",
          artifactPath: "/tmp/review-verification.json",
          envelopeId: "msg_1",
          createError
        },
        {
          createReviewVerificationArtifact: () => buildArtifact(),
          writeReviewVerificationArtifactAtomic: async () => {
            throw new Error("EACCES");
          }
        }
      )
    ).rejects.toThrowError(
      new TestPostAppendReviewVerificationWriterError(
        "PASS msg_1 was appended but review-verification artifact write failed before state transition. State remains unchanged and transcript is canonical; recover via state reconciliation from transcript tail after fixing artifact path/input. Root error: EACCES"
      )
    );
  });
});
