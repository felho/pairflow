import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence.log"
    );
    await writeFile(
      evidenceLogPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
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

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence-benign.log"
    );
    await writeFile(
      evidenceLogPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
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

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence-status-code.log"
    );
    await writeFile(
      evidenceLogPath,
      [
        "pnpm typecheck exit=0 found 0 errors",
        "pnpm test exit=0 406 tests passed",
        "telemetry note: HTTP status 503 during a non-test health probe",
        "helper module reported code: 2 in diagnostics metadata"
      ].join("\n"),
      "utf8"
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

    const typecheckLogPath = join(
      bubble.paths.worktreePath,
      "typecheck-only.log"
    );
    await writeFile(
      typecheckLogPath,
      "pnpm typecheck exit=0 found 0 errors\n",
      "utf8"
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

  it("ignores symlink refs that escape repo/worktree scope", async () => {
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

    const symlinkPath = join(bubble.paths.worktreePath, "outside-link.log");
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
  });

  it("verifies typecheck command from typecheck-specific completion marker even without pass token", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_test_evidence_06",
      task: "Verify typecheck completion marker branch ordering"
    });

    const testLogPath = join(
      bubble.paths.worktreePath,
      "test-run.log"
    );
    await writeFile(
      testLogPath,
      "pnpm test exit=0 406 tests passed\n",
      "utf8"
    );
    const typecheckLogPath = join(
      bubble.paths.worktreePath,
      "typecheck-run.log"
    );
    await writeFile(
      typecheckLogPath,
      "pnpm typecheck exit=0 found 0 errors\n",
      "utf8"
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

    const typecheckLogPath = join(
      bubble.paths.worktreePath,
      "typecheck-watch.log"
    );
    await writeFile(
      typecheckLogPath,
      "pnpm typecheck\nFound 0 errors. Watching for file changes.\n",
      "utf8"
    );
    const testLogPath = join(
      bubble.paths.worktreePath,
      "test-only.log"
    );
    await writeFile(testLogPath, "pnpm test exit=0 406 tests passed\n", "utf8");

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

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence-stale.log"
    );
    await writeFile(
      evidenceLogPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
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
