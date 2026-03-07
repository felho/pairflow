import { chmod, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readReviewerTestEvidenceArtifact,
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective,
  resolveReviewerTestExecutionDirectiveFromArtifact,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../../../src/core/reviewer/testEvidence.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { writeEvidenceLog } from "../../helpers/evidence.js";
import type { BubbleConfig, ReviewArtifactType } from "../../../src/types/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-test-evidence-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("reviewer test evidence verification", () => {
  it("short-circuits docs-only verification without requiring runtime evidence", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_01",
      task: "Docs-only task",
      reviewArtifactType: "document"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_docs_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Docs-only update complete"
        },
        refs: []
      }
    });

    expect(artifact.status).toBe("trusted");
    expect(artifact.decision).toBe("skip_full_rerun");
    expect(artifact.reason_code).toBe("no_trigger");
    expect(artifact.reason_detail).toBe("docs-only scope, runtime checks not required");
    expect(artifact.required_commands).toEqual([]);
    expect(artifact.command_evidence).toEqual([]);
    expect(artifact.git).toEqual({
      commit_sha: null,
      status_hash: null,
      dirty: null
    });
  });

  it("keeps docs-only resolver output trusted without freshness checks", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_02",
      task: "Docs-only task",
      reviewArtifactType: "document"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_docs_002",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Docs-only update complete"
        },
        refs: []
      }
    });

    const explicitDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact,
      worktreePath: bubble.paths.worktreePath,
      reviewArtifactType: "document"
    });
    expect(explicitDirective.skip_full_rerun).toBe(true);
    expect(explicitDirective.reason_code).toBe("no_trigger");
    expect(explicitDirective.verification_status).toBe("trusted");
    expect(explicitDirective.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );

    const compatibilityDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact,
      worktreePath: bubble.paths.worktreePath
    });
    expect(compatibilityDirective.skip_full_rerun).toBe(true);
    expect(compatibilityDirective.reason_code).toBe("no_trigger");
    expect(compatibilityDirective.verification_status).toBe("trusted");
  });

  it("bypasses freshness check for docs-only directives even after worktree changes", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_03",
      task: "Docs-only task",
      reviewArtifactType: "document"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_docs_003",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Docs-only update complete"
        },
        refs: []
      }
    });

    await writeFile(join(bubble.paths.worktreePath, "docs-only-change.txt"), "x\n", "utf8");

    const explicitDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact,
      worktreePath: bubble.paths.worktreePath,
      reviewArtifactType: "document"
    });
    expect(explicitDirective.skip_full_rerun).toBe(true);
    expect(explicitDirective.reason_code).toBe("no_trigger");
    expect(explicitDirective.verification_status).toBe("trusted");

    const compatibilityDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact,
      worktreePath: bubble.paths.worktreePath
    });
    expect(compatibilityDirective.skip_full_rerun).toBe(true);
    expect(compatibilityDirective.reason_code).toBe("no_trigger");
    expect(compatibilityDirective.verification_status).toBe("trusted");
  });

  it("keeps strict behavior for explicit code review_artifact_type", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_code_01",
      task: "Code task",
      reviewArtifactType: "code"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_code_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation finished"
        },
        refs: []
      }
    });

    expect(artifact.status).toBe("untrusted");
    expect(artifact.reason_code).toBe("evidence_missing");
  });

  it("keeps strict behavior for explicit auto review_artifact_type", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_auto_01",
      task: "Auto task",
      reviewArtifactType: "auto"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_auto_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation finished"
        },
        refs: []
      }
    });

    expect(artifact.status).toBe("untrusted");
    expect(artifact.reason_code).toBe("evidence_missing");
  });

  it("keeps strict behavior when review_artifact_type is missing or invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_invalid_01",
      task: "Invalid type task",
      reviewArtifactType: "code"
    });

    const missingTypeConfig = {
      ...bubble.config,
      review_artifact_type: undefined as unknown as ReviewArtifactType
    } satisfies BubbleConfig;
    const missingTypeArtifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: missingTypeConfig,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_invalid_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation finished"
        },
        refs: []
      }
    });
    expect(missingTypeArtifact.status).toBe("untrusted");
    expect(missingTypeArtifact.reason_code).toBe("evidence_missing");

    const invalidTypeConfig = {
      ...bubble.config,
      review_artifact_type: "invalid" as unknown as ReviewArtifactType
    } satisfies BubbleConfig;
    const invalidTypeArtifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: invalidTypeConfig,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_invalid_002",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation finished"
        },
        refs: []
      }
    });
    expect(invalidTypeArtifact.status).toBe("untrusted");
    expect(invalidTypeArtifact.reason_code).toBe("evidence_missing");
  });

  it("marks evidence trusted when required commands include explicit success markers", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_01",
      task: "Verify test evidence"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [evidenceLogPath]
      }
    });

    expect(artifact.status).toBe("trusted");
    expect(artifact.decision).toBe("skip_full_rerun");
    expect(artifact.reason_code).toBe("no_trigger");
  });

  it("requires checks when evidence is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_02",
      task: "Verify test evidence"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_002",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation finished"
        },
        refs: []
      }
    });

    expect(artifact.status).toBe("untrusted");
    expect(artifact.reason_code).toBe("evidence_missing");
  });

  it("does not classify benign error wording as explicit command failure", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_04",
      task: "Verify false-positive handling"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence-benign.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_004",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary:
            "Improved error handling path and silent failures fallback text in docs."
        },
        refs: [evidenceLogPath]
      }
    });

    expect(artifact.status).toBe("trusted");
    expect(artifact.reason_code).toBe("no_trigger");
  });

  it("does not treat unrelated status/code output as command exit failure", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_12",
      task: "Verify exit-failure pattern precision"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence-status-code.log",
      [
        "pnpm typecheck exit=0 found 0 errors",
        "pnpm test exit=0 406 tests passed",
        "telemetry note: HTTP status 503 during a non-test health probe",
        "helper module reported code: 2 in diagnostics metadata"
      ].join("\n"),
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_012",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [evidenceLogPath]
      }
    });

    expect(artifact.status).toBe("trusted");
    expect(artifact.reason_code).toBe("no_trigger");
  });

  it("does not trust summary-only evidence without ref-backed provenance", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_07",
      task: "Verify summary-only provenance rejection"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_007",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary:
            "pnpm typecheck exit=0 found 0 errors; pnpm test exit=0 406 tests passed"
        },
        refs: []
      }
    });

    expect(artifact.status).toBe("untrusted");
    expect(artifact.reason_code).toBe("evidence_unverifiable");
    expect(
      artifact.command_evidence.some(
        (entry) => entry.source === "summary" && entry.status === "verified"
      )
    ).toBe(false);
  });

  it("does not trust mixed provenance when any required command is summary-only", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_10",
      task: "Verify mixed provenance rejection"
    });

    const typecheckLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "typecheck-only.log",
      "pnpm typecheck exit=0 found 0 errors\n",
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_010",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "pnpm test exit=0 406 tests passed"
        },
        refs: [typecheckLogPath]
      }
    });

    expect(artifact.status).toBe("untrusted");
    expect(artifact.reason_code).toBe("evidence_unverifiable");
    const testEvidence = artifact.command_evidence.find((entry) =>
      entry.command.includes("test")
    );
    expect(testEvidence?.source).toBe("summary");
    expect(testEvidence?.status).toBe("unverifiable");
  });

  it("ignores --ref files outside repo/worktree scope", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_05",
      task: "Verify ref path containment"
    });

    const outsidePath = join(tmpdir(), "pairflow-outside-ref.log");
    await writeFile(
      outsidePath,
      "pnpm typecheck exit=0 found 0 errors; pnpm test exit=0 406 tests passed\n",
      "utf8"
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_005",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation complete."
        },
        refs: [outsidePath]
      }
    });

    expect(artifact.status).toBe("untrusted");
    expect(artifact.reason_code).toBe("evidence_missing");
  });

  it("rejects symlink escapes under .pairflow/evidence with source_outside_repo_scope", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_13",
      task: "Verify symlink containment for refs"
    });

    const outsideDir = await mkdtemp(join(tmpdir(), "pairflow-outside-ref-"));
    tempDirs.push(outsideDir);
    const outsidePath = join(outsideDir, "outside-target.log");
    await writeFile(
      outsidePath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
    );

    const symlinkPath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "evidence",
      "outside-link.log"
    );
    await mkdir(join(symlinkPath, ".."), { recursive: true });
    await symlink(outsidePath, symlinkPath);

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_013",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation complete."
        },
        refs: [symlinkPath]
      }
    });

    expect(artifact.status).toBe("untrusted");
    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.allowed_ref_paths).toEqual([]);
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: symlinkPath, reason: "source_outside_repo_scope" }
    ]);
    expect(
      artifact.command_evidence.some((entry) => entry.source === "ref")
    ).toBe(false);
  });

  it("keeps whitelist diagnostics for mixed allowed and rejected refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_01",
      task: "Whitelist diagnostics for mixed refs"
    });

    const allowedLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "policy-mixed.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n"
    );
    const donePackagePath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "bubbles",
      "demo",
      "artifacts",
      "done-package.md"
    );
    await mkdir(join(donePackagePath, ".."), { recursive: true });
    await writeFile(donePackagePath, "# done package\n", "utf8");
    const reviewerArtifactPath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "bubbles",
      "demo",
      "artifacts",
      "reviewer-test-verification.json"
    );
    await writeFile(reviewerArtifactPath, "{ \"schema_version\": 1 }\n", "utf8");

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [allowedLogPath, donePackagePath, reviewerArtifactPath]
      }
    });
    const canonicalAllowedLogPath = await realpath(allowedLogPath);

    expect(artifact.status).toBe("trusted");
    expect(artifact.reason_code).toBe("no_trigger");
    expect(artifact.diagnostics?.source_policy.allowed_ref_paths).toEqual([canonicalAllowedLogPath]);
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: donePackagePath, reason: "source_not_whitelisted" },
      { input_ref: reviewerArtifactPath, reason: "source_not_whitelisted" }
    ]);
  });

  it("preserves EvidenceSourcePolicyDecision fields through source filtering and classification (T12)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_12",
      task: "Lifecycle binding coverage"
    });

    const allowedLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "lifecycle-typecheck.log",
      "pnpm typecheck exit=0 found 0 errors\n"
    );
    const outsideRoot = await mkdtemp(join(tmpdir(), "pairflow-policy-lifecycle-outside-"));
    tempDirs.push(outsideRoot);
    const outsidePath = join(outsideRoot, ".pairflow", "evidence", "outside.log");
    await mkdir(join(outsidePath, ".."), { recursive: true });
    await writeFile(outsidePath, "pnpm test exit=0 406 tests passed\n", "utf8");
    const proseRef = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "bubbles",
      "lifecycle",
      "artifacts",
      "done-package.md"
    );
    await mkdir(join(proseRef, ".."), { recursive: true });
    await writeFile(proseRef, "# not a command log\n", "utf8");

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_012",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: [allowedLogPath, outsidePath, proseRef]
      }
    });
    const diagnostics = artifact.diagnostics?.source_policy;
    const canonicalAllowedLogPath = await realpath(allowedLogPath);

    expect(diagnostics).toBeDefined();
    expect(diagnostics?.allowed_ref_paths).toEqual([canonicalAllowedLogPath]);
    expect(diagnostics?.rejected_refs).toEqual([
      { input_ref: outsidePath, reason: "source_outside_repo_scope" },
      { input_ref: proseRef, reason: "source_not_whitelisted" }
    ]);
    expect(artifact.command_evidence.every((entry) => {
      if (entry.source !== "ref") {
        return true;
      }
      return diagnostics?.allowed_ref_paths.includes(entry.source_ref ?? "") ?? false;
    })).toBe(true);
    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.reason_detail).toContain("Source policy rejected 2 --ref input(s).");
  });

  it("rejects protocol refs with source_protocol_not_allowed reason", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_02",
      task: "Protocol ref rejection"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_002",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: ["https://example.com/evidence.log"]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      {
        input_ref: "https://example.com/evidence.log",
        reason: "source_protocol_not_allowed"
      }
    ]);
  });

  it("rejects non-log and nested evidence refs with source_not_whitelisted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_03",
      task: "Whitelist extension and depth policy"
    });

    const wrongExtensionPath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "evidence",
      "policy.txt"
    );
    await mkdir(join(wrongExtensionPath, ".."), { recursive: true });
    await writeFile(wrongExtensionPath, "pnpm test exit=0\n", "utf8");
    const nestedPath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "evidence",
      "subdir",
      "policy.log"
    );
    await mkdir(join(nestedPath, ".."), { recursive: true });
    await writeFile(nestedPath, "pnpm test exit=0\n", "utf8");

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_003",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: [wrongExtensionPath, nestedPath]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: wrongExtensionPath, reason: "source_not_whitelisted" },
      { input_ref: nestedPath, reason: "source_not_whitelisted" }
    ]);
  });

  it("rejects outside refs with source_outside_repo_scope for absolute and traversal paths", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_04",
      task: "Outside-scope reason coverage"
    });

    const outsideRoot = await mkdtemp(join(tmpdir(), "pairflow-policy-outside-"));
    tempDirs.push(outsideRoot);
    const outsidePath = join(outsideRoot, ".pairflow", "evidence", "outside.log");
    await mkdir(join(outsidePath, ".."), { recursive: true });
    await writeFile(
      outsidePath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
    );
    const traversalRef = relative(bubble.paths.worktreePath, outsidePath);

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_004",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: [outsidePath, traversalRef]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: outsidePath, reason: "source_outside_repo_scope" },
      { input_ref: traversalRef, reason: "source_outside_repo_scope" }
    ]);
  });

  it("rejects canonicalization failures with source_canonicalization_failed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_05",
      task: "Canonicalization failure policy"
    });

    const missingRefPath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "evidence",
      "missing.log"
    );
    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_005",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: [missingRefPath]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: missingRefPath, reason: "source_canonicalization_failed" }
    ]);
    expect(artifact.diagnostics?.source_policy.mode_marker).toBeUndefined();
  });

  it("rejects unreadable log refs with source_canonicalization_failed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_13",
      task: "Read failure policy"
    });

    const unreadablePath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "evidence",
      "unreadable.log"
    );
    await mkdir(join(unreadablePath, ".."), { recursive: true });
    await writeFile(unreadablePath, "pnpm test exit=0 406 tests passed\n", "utf8");
    await chmod(unreadablePath, 0);

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_013",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: [unreadablePath]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: unreadablePath, reason: "source_canonicalization_failed" }
    ]);
  });

  it("rejects fragment-only refs with source_not_whitelisted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_14",
      task: "Fragment-only policy"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_014",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: ["#L1"]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: "#L1", reason: "source_not_whitelisted" }
    ]);
  });

  it("deduplicates canonical refs and keeps first-seen source", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_06",
      task: "Duplicate ref dedupe behavior"
    });

    const logPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "duplicate.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n"
    );
    const duplicateRef = "./.pairflow/evidence/duplicate.log#L1";

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_006",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [logPath, duplicateRef]
      }
    });
    const canonicalLogPath = await realpath(logPath);

    expect(artifact.status).toBe("trusted");
    expect(artifact.reason_code).toBe("no_trigger");
    expect(artifact.diagnostics?.source_policy.allowed_ref_paths).toEqual([canonicalLogPath]);
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: duplicateRef, reason: "source_duplicate_ref" }
    ]);
    expect(
      artifact.command_evidence.every((entry) =>
        entry.source === "ref" ? entry.source_ref === canonicalLogPath : true
      )
    ).toBe(true);
  });

  it("accepts relative in-scope evidence refs under .pairflow/evidence", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_07",
      task: "Relative in-scope ref allowlist"
    });

    await writeEvidenceLog(
      bubble.paths.worktreePath,
      "relative.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n"
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_007",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: ["./.pairflow/evidence/relative.log"]
      }
    });

    expect(artifact.status).toBe("trusted");
    expect(artifact.reason_code).toBe("no_trigger");
    expect(artifact.diagnostics?.source_policy.allowed_ref_paths).toHaveLength(1);
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([]);
  });

  it("classifies empty ref list as evidence_missing without fallback marker", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_08",
      task: "Empty ref list policy"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_008",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: []
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([]);
    expect(artifact.diagnostics?.source_policy.mode_marker).toBeUndefined();
    expect(artifact.reason_detail).toContain("No --ref inputs were provided.");
  });

  it("applies strict source policy fallback marker when evaluator fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_09",
      task: "Forced source policy fallback"
    });

    const nestedPath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "evidence",
      "subdir",
      "fallback.log"
    );
    await mkdir(join(nestedPath, ".."), { recursive: true });
    await writeFile(
      nestedPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_009",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim.",
          metadata: {
            test_evidence_policy_force_fallback: true
          }
        },
        refs: [nestedPath]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.mode_marker).toBe("source_policy_fallback");
    expect(artifact.diagnostics?.source_policy.fallback_context).toBe("forced_fallback");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: nestedPath, reason: "source_not_whitelisted" }
    ]);
    expect(artifact.reason_detail).toContain("source_policy_fallback(forced_fallback)");
  });

  it("preserves fallback context when trust-anchor resolution triggers fallback mode", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_20",
      task: "Fallback context diagnostics"
    });
    const missingRepoPath = join(bubble.paths.worktreePath, "missing-repo-root");

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath: missingRepoPath,
      envelope: {
        id: "msg_policy_020",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: []
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.mode_marker).toBe("source_policy_fallback");
    expect(artifact.diagnostics?.source_policy.fallback_context).toBeDefined();
    expect(artifact.reason_detail).toContain("source_policy_fallback(");
  });

  it("keeps top-level and source-policy reason namespaces separated", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_policy_10",
      task: "Reason namespace boundary"
    });

    const donePackagePath = join(
      bubble.paths.worktreePath,
      ".pairflow",
      "bubbles",
      "namespace",
      "artifacts",
      "done-package.md"
    );
    await mkdir(join(donePackagePath, ".."), { recursive: true });
    await writeFile(donePackagePath, "# docs\n", "utf8");

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_policy_010",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "No verification claim."
        },
        refs: [donePackagePath]
      }
    });

    expect(artifact.reason_code).toBe("evidence_missing");
    expect(artifact.diagnostics?.source_policy.rejected_refs).toEqual([
      { input_ref: donePackagePath, reason: "source_not_whitelisted" }
    ]);
  });

  it("verifies typecheck command from typecheck-specific completion marker even without pass token", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_06",
      task: "Verify typecheck completion marker branch ordering"
    });

    const testLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "test-run.log",
      "pnpm test exit=0 406 tests passed\n",
    );
    const typecheckLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "typecheck-run.log",
      "pnpm typecheck exit=0 found 0 errors\n",
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_006",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [testLogPath, typecheckLogPath]
      }
    });

    const typecheckEvidence = artifact.command_evidence.find((entry) =>
      entry.command.includes("typecheck")
    );
    expect(typecheckEvidence?.completion_marker).toBe(true);
    expect(typecheckEvidence?.status).toBe("verified");
    expect(artifact.status).toBe("trusted");
  });

  it("verifies typecheck from 'Found 0 errors' output without explicit exit markers", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_09",
      task: "Verify raw tsc success marker handling"
    });

    const typecheckLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "typecheck-watch.log",
      "pnpm typecheck\nFound 0 errors. Watching for file changes.\n",
    );
    const testLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "test-only.log",
      "pnpm test exit=0 406 tests passed\n"
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_009",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [typecheckLogPath, testLogPath]
      }
    });

    const typecheckEvidence = artifact.command_evidence.find((entry) =>
      entry.command.includes("typecheck")
    );
    expect(typecheckEvidence?.completion_marker).toBe(true);
    expect(typecheckEvidence?.explicit_exit_status).toBe(false);
    expect(typecheckEvidence?.status).toBe("verified");
    expect(artifact.status).toBe("trusted");
  });

  it("marks trusted artifact stale when worktree changes after verification", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_03",
      task: "Verify stale evidence"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence-stale.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_003",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [evidenceLogPath]
      }
    });

    const artifactPath = resolveReviewerTestEvidenceArtifactPath(
      bubble.paths.artifactsDir
    );
    await writeReviewerTestEvidenceArtifact(artifactPath, artifact);

    await writeFile(join(bubble.paths.worktreePath, "stale-change.txt"), "x\n", "utf8");

    const directive = await resolveReviewerTestExecutionDirective({
      artifactPath,
      worktreePath: bubble.paths.worktreePath
    });

    expect(directive.skip_full_rerun).toBe(false);
    expect(directive.reason_code).toBe("evidence_stale");
  });

  it("resolves docs-only directive as skip_full_rerun through wrapper API", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_wrapper_01",
      task: "Docs-only wrapper resolver coverage",
      reviewArtifactType: "document"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_docs_wrap_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Docs-only update complete"
        },
        refs: []
      }
    });
    const artifactPath = resolveReviewerTestEvidenceArtifactPath(
      bubble.paths.artifactsDir
    );
    await writeReviewerTestEvidenceArtifact(artifactPath, artifact);

    await writeFile(join(bubble.paths.worktreePath, "docs-wrapper-change.txt"), "x\n", "utf8");

    const directive = await resolveReviewerTestExecutionDirective({
      artifactPath,
      worktreePath: bubble.paths.worktreePath,
      reviewArtifactType: "document"
    });

    expect(directive.skip_full_rerun).toBe(true);
    expect(directive.reason_code).toBe("no_trigger");
    expect(directive.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );
    expect(directive.verification_status).toBe("trusted");
  });

  it("returns docs-only skip directive when artifact is missing through wrapper API", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_wrapper_02",
      task: "Docs-only wrapper missing artifact coverage",
      reviewArtifactType: "document"
    });

    const directive = await resolveReviewerTestExecutionDirective({
      artifactPath: join(bubble.paths.artifactsDir, "missing-reviewer-evidence.json"),
      worktreePath: bubble.paths.worktreePath,
      reviewArtifactType: "document"
    });

    expect(directive.skip_full_rerun).toBe(true);
    expect(directive.reason_code).toBe("no_trigger");
    expect(directive.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );
    expect(directive.verification_status).toBe("trusted");
  });

  it("keeps strict missing-artifact behavior for code and auto wrapper inputs", async () => {
    const repoPath = await createTempRepo();

    for (const reviewArtifactType of ["code", "auto"] as const) {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: `b_test_evidence_wrapper_missing_${reviewArtifactType}`,
        task: `Wrapper missing artifact strict behavior ${reviewArtifactType}`,
        reviewArtifactType
      });

      const directive = await resolveReviewerTestExecutionDirective({
        artifactPath: join(bubble.paths.artifactsDir, "missing-reviewer-evidence.json"),
        worktreePath: bubble.paths.worktreePath,
        reviewArtifactType
      });

      expect(directive.skip_full_rerun).toBe(false);
      expect(directive.reason_code).toBe("evidence_missing");
      expect(directive.verification_status).toBe("missing");
      expect(directive.reason_detail).toContain(
        "No reviewer test verification artifact found for the latest implementer handoff."
      );
    }
  });

  it("returns docs-only skip directive when artifact read fails through wrapper API", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_wrapper_03",
      task: "Docs-only wrapper read-failure coverage",
      reviewArtifactType: "document"
    });

    const directive = await resolveReviewerTestExecutionDirective({
      artifactPath: bubble.paths.artifactsDir,
      worktreePath: bubble.paths.worktreePath,
      reviewArtifactType: "document"
    });

    expect(directive.skip_full_rerun).toBe(true);
    expect(directive.reason_code).toBe("no_trigger");
    expect(directive.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );
    expect(directive.verification_status).toBe("trusted");
  });

  it("overrides untrusted artifact to docs-only skip when reviewArtifactType is document", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_untrusted_01",
      task: "Docs-only untrusted artifact override",
      reviewArtifactType: "document"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_docs_untrusted_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Docs-only update complete"
        },
        refs: []
      }
    });

    const untrustedArtifact = {
      ...artifact,
      status: "untrusted" as const,
      decision: "run_checks" as const,
      reason_code: "evidence_unverifiable" as const,
      reason_detail: "Manually marked untrusted for branch coverage."
    };

    const directive = await resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact: untrustedArtifact,
      worktreePath: bubble.paths.worktreePath,
      reviewArtifactType: "document"
    });

    expect(directive.skip_full_rerun).toBe(true);
    expect(directive.reason_code).toBe("no_trigger");
    expect(directive.verification_status).toBe("trusted");
  });

  it("does not trigger compatibility skip for partial docs-like artifacts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_docs_compat_negative_01",
      task: "Docs-only compatibility negative coverage",
      reviewArtifactType: "document"
    });

    const artifact = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      worktreePath: bubble.paths.worktreePath,
      repoPath,
      envelope: {
        id: "msg_docs_compat_negative_001",
        ts: "2026-02-27T12:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Docs-only update complete"
        },
        refs: []
      }
    });

    const reasonMismatchDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact: {
        ...artifact,
        reason_detail: "Evidence is verified, fresh, and complete."
      },
      worktreePath: bubble.paths.worktreePath
    });
    expect(reasonMismatchDirective.skip_full_rerun).toBe(false);
    expect(reasonMismatchDirective.reason_code).toBe("evidence_stale");
    expect(reasonMismatchDirective.verification_status).toBe("untrusted");

    const requiredCommandsMismatchDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact: {
        ...artifact,
        required_commands: ["pnpm test"]
      },
      worktreePath: bubble.paths.worktreePath
    });
    expect(requiredCommandsMismatchDirective.skip_full_rerun).toBe(false);
    expect(requiredCommandsMismatchDirective.reason_code).toBe("evidence_stale");
    expect(requiredCommandsMismatchDirective.verification_status).toBe("untrusted");
  });

  it("returns undefined for invalid JSON artifact content", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_08",
      task: "Verify invalid artifact parsing contract"
    });

    const artifactPath = resolveReviewerTestEvidenceArtifactPath(
      bubble.paths.artifactsDir
    );
    await writeFile(artifactPath, "{ invalid json", "utf8");

    const artifact = await readReviewerTestEvidenceArtifact(artifactPath);
    expect(artifact).toBeUndefined();

    const directive = await resolveReviewerTestExecutionDirective({
      artifactPath,
      worktreePath: bubble.paths.worktreePath
    });

    expect(directive.skip_full_rerun).toBe(false);
    expect(directive.reason_code).toBe("evidence_missing");
    expect(directive.verification_status).toBe("missing");
  });

  it("marks directive as unverifiable when artifact read fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_11",
      task: "Verify directive classification for artifact read I/O failures"
    });

    const directive = await resolveReviewerTestExecutionDirective({
      artifactPath: bubble.paths.artifactsDir,
      worktreePath: bubble.paths.worktreePath
    });

    expect(directive.skip_full_rerun).toBe(false);
    expect(directive.reason_code).toBe("evidence_unverifiable");
    expect(directive.verification_status).toBe("untrusted");
    expect(directive.reason_detail).toContain("artifact read failed");
  });
});
