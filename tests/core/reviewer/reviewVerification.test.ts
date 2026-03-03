import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { formatReviewerBriefPrompt } from "../../../src/core/reviewer/reviewerBrief.js";
import {
  createReviewVerificationArtifact,
  readReviewVerificationArtifactStatus,
  resolveReviewVerificationInputFromRefs,
  validateReviewVerificationArtifact,
  validateReviewVerificationPayload,
  writeReviewVerificationArtifactAtomic
} from "../../../src/core/reviewer/reviewVerification.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-review-verification-"));
  tempDirs.push(root);
  return root;
}

describe("reviewer brief formatting", () => {
  it("preserves multiline reviewer brief content in startup prompt", () => {
    const formatted = formatReviewerBriefPrompt("Line 1\nLine 2");
    expect(formatted).toContain(
      "Reviewer brief (persisted artifact `reviewer-brief.md`):\nLine 1\nLine 2"
    );
  });
});

describe("validateReviewVerificationArtifact", () => {
  it("reports payload and artifact-level errors together", () => {
    const result = validateReviewVerificationArtifact({
      schema: "wrong_schema",
      overall: "pass",
      claims: [
        {
          claim_id: "C1",
          status: "verified",
          evidence_refs: ["src/x.ts:1"]
        }
      ],
      meta: {
        bubble_id: "b1",
        round: 1,
        reviewer: "claude",
        generated_at: "2026-03-03T09:00:00.000Z"
      },
      validation: {
        status: "valid",
        errors: []
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected artifact validation failure");
    }
    expect(result.errors.some((entry) => entry.path === "schema")).toBe(true);
    expect(result.errors.some((entry) => entry.path === "input_ref")).toBe(true);
  });
});

describe("validateReviewVerificationPayload", () => {
  it("accepts valid unknown claim with required note", () => {
    const result = validateReviewVerificationPayload({
      schema: "review_verification_v1",
      overall: "pass",
      claims: [
        {
          claim_id: "C1",
          status: "unknown",
          note: "Evidence source unavailable in this round."
        }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected payload validation success");
    }
    expect(result.value.claims).toEqual([
      {
        claim_id: "C1",
        status: "unknown",
        note: "Evidence source unavailable in this round."
      }
    ]);
  });

  it("does not add dependent field errors when claim_id/status are invalid", () => {
    const result = validateReviewVerificationPayload({
      schema: "review_verification_v1",
      overall: "pass",
      claims: [
        {
          claim_id: "",
          status: "broken",
          evidence_refs: 123,
          note: 456
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected payload validation failure");
    }
    expect(result.errors.some((entry) => entry.path === "claims[0].claim_id")).toBe(true);
    expect(result.errors.some((entry) => entry.path === "claims[0].status")).toBe(true);
    expect(result.errors.some((entry) => entry.path === "claims[0].evidence_refs")).toBe(false);
    expect(result.errors.some((entry) => entry.path === "claims[0].note")).toBe(false);
  });
});

describe("review verification I/O helpers", () => {
  it("resolves verification payload from refs using canonical input basename", async () => {
    const root = await createTempDir();
    const inputPath = join(root, "review-verification-input.json");
    await writeFile(
      inputPath,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      }),
      "utf8"
    );

    const resolved = await resolveReviewVerificationInputFromRefs({
      refs: ["notes.txt", "review-verification-input.json"],
      worktreePath: root
    });

    expect(resolved.inputRef).toBe("review-verification-input.json");
    expect(resolved.resolvedPath).toBe(inputPath);
    expect(resolved.payload.overall).toBe("pass");
  });

  it("writes and reads verification artifact status with expected round/reviewer checks", async () => {
    const root = await createTempDir();
    const artifactPath = join(root, "review-verification.json");
    const artifact = createReviewVerificationArtifact({
      payload: {
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      },
      inputRef: "review-verification-input.json",
      bubbleId: "b_review_verification_01",
      round: 3,
      reviewer: "claude",
      generatedAt: "2026-03-03T10:00:00.000Z"
    });
    await writeReviewVerificationArtifactAtomic(artifactPath, artifact);

    const status = await readReviewVerificationArtifactStatus(artifactPath);
    expect(status.status).toBe("pass");
    expect(status.artifact?.meta.round).toBe(3);

    const staleRound = await readReviewVerificationArtifactStatus(artifactPath, {
      expectedRound: 4
    });
    expect(staleRound.status).toBe("invalid");

    const wrongReviewer = await readReviewVerificationArtifactStatus(artifactPath, {
      expectedReviewer: "codex"
    });
    expect(wrongReviewer.status).toBe("invalid");
  });
});
