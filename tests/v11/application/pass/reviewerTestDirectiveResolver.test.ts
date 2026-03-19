import { describe, expect, it } from "vitest";

import {
  reviewerTestEvidenceSchemaVersion,
  type ReviewerTestEvidenceArtifact,
  type ReviewerTestExecutionDirective
} from "../../../../src/core/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";
import { resolveReviewerTestDirectiveForPass } from "../../../../src/v11/application/pass/reviewerTestDirectiveResolver.js";

function createBubbleConfig(
  reviewArtifactType: BubbleConfig["review_artifact_type"] = "code"
): BubbleConfig {
  return {
    id: "b_test_directive_01",
    repo_path: "/tmp/repo",
    base_branch: "main",
    bubble_branch: "pf/b_test_directive_01",
    work_mode: "worktree",
    quality_mode: "strict",
    review_artifact_type: reviewArtifactType,
    pairflow_command_profile: "external",
    reviewer_context_mode: "persistent",
    watchdog_timeout_minutes: 5,
    max_rounds: 8,
    severity_gate_round: 4,
    commit_requires_approval: true,
    attach_launcher: "auto",
    agents: {
      implementer: "codex",
      reviewer: "claude"
    },
    commands: {
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    },
    notifications: {
      enabled: true
    },
    enforcement_mode: {
      all_gate: "advisory",
      docs_gate: "advisory"
    },
    doc_contract_gates: {
      round_gate_applies_after: 2
    }
  };
}

function createEnvelope(): ProtocolEnvelope {
  return {
    id: "msg_20260319_002",
    ts: "2026-03-19T12:00:00.000Z",
    bubble_id: "b_test_directive_01",
    sender: "codex",
    recipient: "claude",
    type: "PASS",
    round: 1,
    payload: {
      summary: "handoff"
    },
    refs: []
  };
}

function createEvidenceArtifact(): ReviewerTestEvidenceArtifact {
  return {
    schema_version: reviewerTestEvidenceSchemaVersion,
    bubble_id: "b_test_directive_01",
    pass_envelope_id: "msg_20260319_002",
    pass_ts: "2026-03-19T12:00:00.000Z",
    round: 1,
    verified_at: "2026-03-19T12:00:01.000Z",
    status: "trusted",
    decision: "skip_full_rerun",
    reason_code: "no_trigger",
    reason_detail: "docs-only scope, runtime checks not required",
    required_commands: [],
    command_evidence: [],
    git: {
      commit_sha: null,
      status_hash: null,
      dirty: null
    }
  };
}

describe("resolveReviewerTestDirectiveForPass", () => {
  it("returns undefined for reviewer sender role", async () => {
    let verifyCalled = false;
    const directive = await resolveReviewerTestDirectiveForPass(
      {
        senderRole: "reviewer",
        bubbleId: "b_test_directive_01",
        bubbleConfig: createBubbleConfig("code"),
        envelope: createEnvelope(),
        worktreePath: "/tmp/worktree",
        repoPath: "/tmp/repo",
        artifactsDir: "/tmp/artifacts",
        now: new Date("2026-03-19T12:00:00.000Z")
      },
      {
        verifyImplementerTestEvidence: async () => {
          verifyCalled = true;
          return createEvidenceArtifact();
        }
      }
    );

    expect(directive).toBeUndefined();
    expect(verifyCalled).toBe(false);
  });

  it("returns resolved directive when evidence verify/write/resolve succeeds", async () => {
    const writes: Array<{ path: string; artifact: ReviewerTestEvidenceArtifact }> = [];
    const expectedDirective: ReviewerTestExecutionDirective = {
      skip_full_rerun: false,
      reason_code: "evidence_stale",
      reason_detail: "stale log reference",
      verification_status: "trusted"
    };

    const directive = await resolveReviewerTestDirectiveForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_test_directive_01",
        bubbleConfig: createBubbleConfig("code"),
        envelope: createEnvelope(),
        worktreePath: "/tmp/worktree",
        repoPath: "/tmp/repo",
        artifactsDir: "/tmp/artifacts",
        now: new Date("2026-03-19T12:00:00.000Z")
      },
      {
        verifyImplementerTestEvidence: async () => createEvidenceArtifact(),
        writeReviewerTestEvidenceArtifact: async (artifactPath, artifact) => {
          writes.push({ path: artifactPath, artifact });
        },
        resolveReviewerTestExecutionDirectiveFromArtifact: async () => expectedDirective
      }
    );

    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toContain("/tmp/artifacts");
    expect(writes[0]?.artifact.pass_envelope_id).toBe("msg_20260319_002");
    expect(directive).toEqual(expectedDirective);
  });

  it("falls back to docs-only skip directive when artifact write fails", async () => {
    const directive = await resolveReviewerTestDirectiveForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_test_directive_01",
        bubbleConfig: createBubbleConfig("document"),
        envelope: createEnvelope(),
        worktreePath: "/tmp/worktree",
        repoPath: "/tmp/repo",
        artifactsDir: "/tmp/artifacts",
        now: new Date("2026-03-19T12:00:00.000Z")
      },
      {
        verifyImplementerTestEvidence: async () => createEvidenceArtifact(),
        writeReviewerTestEvidenceArtifact: async () => {
          throw new Error("write failed");
        }
      }
    );

    expect(directive).toEqual({
      skip_full_rerun: true,
      reason_code: "no_trigger",
      reason_detail: "docs-only scope, runtime checks not required",
      verification_status: "trusted"
    });
  });

  it("falls back to untrusted run_checks directive when evidence verification fails", async () => {
    const directive = await resolveReviewerTestDirectiveForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_test_directive_01",
        bubbleConfig: createBubbleConfig("code"),
        envelope: createEnvelope(),
        worktreePath: "/tmp/worktree",
        repoPath: "/tmp/repo",
        artifactsDir: "/tmp/artifacts",
        now: new Date("2026-03-19T12:00:00.000Z")
      },
      {
        verifyImplementerTestEvidence: async () => {
          throw new Error("verification runtime failure");
        }
      }
    );

    expect(directive).toEqual({
      skip_full_rerun: false,
      reason_code: "evidence_unverifiable",
      reason_detail:
        "Failed to resolve reviewer test directive due to verification runtime error.",
      verification_status: "untrusted"
    });
  });
});
