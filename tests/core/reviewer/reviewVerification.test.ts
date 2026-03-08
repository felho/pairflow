import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  formatReviewerBriefPrompt,
  formatReviewerFocusBridgeBlock,
  formatReviewerFocusDeliveryReminder,
  readReviewerFocusArtifact,
  isReviewerFocusExtractionResult
} from "../../../src/core/reviewer/reviewerBrief.js";
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

describe("reviewer focus bridge formatting", () => {
  it("renders list focus in stable order with canonical bridge heading", () => {
    const formatted = formatReviewerFocusBridgeBlock({
      status: "present",
      source: "frontmatter",
      focus_text: "- First item\n\n- Second item",
      focus_items: ["First item", "Second item"]
    });

    expect(formatted).toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):\n- First item\n\n- Second item"
    );
    expect(formatted).toContain(
      "Treat this reviewer focus as mandatory review context."
    );
  });

  it("rejects unknown reason_code values in reviewer focus artifact payload", () => {
    const parsed: unknown = {
      status: "invalid",
      source: "frontmatter",
      reason_code: "SOME_UNKNOWN_REASON"
    };

    expect(isReviewerFocusExtractionResult(parsed)).toBe(false);
  });

  it("rejects status-incompatible reason_code for present reviewer focus payloads", () => {
    const parsed: unknown = {
      status: "present",
      source: "section",
      focus_text: "Valid focus text.",
      reason_code: "REVIEWER_FOCUS_ABSENT"
    };

    expect(isReviewerFocusExtractionResult(parsed)).toBe(false);
  });

  it("rejects present reviewer focus payload when source is none", () => {
    const parsed: unknown = {
      status: "present",
      source: "none",
      focus_text: "Valid focus text."
    };

    expect(isReviewerFocusExtractionResult(parsed)).toBe(false);
  });

  it("rejects status-incompatible reason_code for absent reviewer focus payloads", () => {
    const parsed: unknown = {
      status: "absent",
      source: "none",
      reason_code: "REVIEWER_FOCUS_EMPTY_SECTION"
    };

    expect(isReviewerFocusExtractionResult(parsed)).toBe(false);
  });

  it("rejects absent reviewer focus payload when reason_code is parse warning", () => {
    const parsed: unknown = {
      status: "absent",
      source: "none",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };

    expect(isReviewerFocusExtractionResult(parsed)).toBe(false);
  });

  it("rejects status-incompatible reason_code for invalid reviewer focus payloads", () => {
    const parsed: unknown = {
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_ABSENT"
    };

    expect(isReviewerFocusExtractionResult(parsed)).toBe(false);
  });

  it("accepts parse-warning reason_code for invalid reviewer focus payloads", () => {
    const parsed: unknown = {
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };

    expect(isReviewerFocusExtractionResult(parsed)).toBe(true);
  });

  it("accepts invalid reviewer focus payload with source=none only for parse-warning", () => {
    const accepted: unknown = {
      status: "invalid",
      source: "none",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };
    const rejected: unknown = {
      status: "invalid",
      source: "none",
      reason_code: "REVIEWER_FOCUS_EMPTY_SECTION"
    };

    expect(isReviewerFocusExtractionResult(accepted)).toBe(true);
    expect(isReviewerFocusExtractionResult(rejected)).toBe(false);
  });

  it("returns empty bridge block for absent and invalid reviewer focus payloads", () => {
    expect(
      formatReviewerFocusBridgeBlock({
        status: "absent",
        source: "none",
        reason_code: "REVIEWER_FOCUS_ABSENT"
      })
    ).toBe("");
    expect(
      formatReviewerFocusBridgeBlock({
        status: "invalid",
        source: "section",
        reason_code: "REVIEWER_FOCUS_EMPTY_SECTION"
      })
    ).toBe("");
  });

  it("returns empty delivery reminder for absent and invalid reviewer focus payloads", () => {
    expect(
      formatReviewerFocusDeliveryReminder({
        status: "absent",
        source: "none",
        reason_code: "REVIEWER_FOCUS_ABSENT"
      })
    ).toBe("");
    expect(
      formatReviewerFocusDeliveryReminder({
        status: "invalid",
        source: "frontmatter",
        reason_code: "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING"
      })
    ).toBe("");
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
  it("returns invalid parse-warning signal when reviewer focus artifact JSON is malformed", async () => {
    const root = await createTempDir();
    const artifactPath = join(root, "reviewer-focus.json");
    await writeFile(artifactPath, "{ malformed", "utf8");

    const loaded = await readReviewerFocusArtifact(artifactPath);
    expect(loaded).toEqual({
      status: "invalid",
      source: "none",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    });
  });

  it("returns undefined when reviewer focus artifact payload fails schema validation", async () => {
    const root = await createTempDir();
    const artifactPath = join(root, "reviewer-focus.json");
    await writeFile(
      artifactPath,
      JSON.stringify({
        status: "present",
        source: "none",
        focus_text: "Invalid source for present status."
      }),
      "utf8"
    );

    const loaded = await readReviewerFocusArtifact(artifactPath);
    expect(loaded).toBeUndefined();
  });

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
