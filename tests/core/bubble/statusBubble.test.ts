import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { emitHumanReply } from "../../../src/core/human/reply.js";
import { getBubbleStatus } from "../../../src/core/bubble/statusBubble.js";
import { resolveDocContractGateArtifactPath } from "../../../src/core/gates/docContractGates.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-status-bubble-"));
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

describe("getBubbleStatus", () => {
  it("returns state/watchdog/transcript summary and pending inbox counts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_01",
      task: "Status task"
    });

    await emitAskHumanFromWorkspace({
      question: "Need approval?",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:03:00.000Z")
    });

    expect(status.state).toBe("WAITING_HUMAN");
    expect(status.pendingInboxItems.humanQuestions).toBe(1);
    expect(status.pendingInboxItems.total).toBe(1);
    expect(status.transcript.lastMessageType).toBe("HUMAN_QUESTION");
    expect(status.watchdog.timeoutMinutes).toBe(30);
    expect(status.watchdog.remainingSeconds).toBe(1620);
  });

  it("clears pending human question count after reply", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_02",
      task: "Status task"
    });

    await emitAskHumanFromWorkspace({
      question: "Need decision",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T14:10:00.000Z")
    });
    await emitHumanReply({
      bubbleId: bubble.bubbleId,
      message: "Proceed",
      cwd: repoPath,
      now: new Date("2026-02-22T14:11:00.000Z")
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.state).toBe("RUNNING");
    expect(status.pendingInboxItems.humanQuestions).toBe(0);
    expect(status.transcript.lastMessageType).toBe("HUMAN_REPLY");
  });

  it("reports accuracy-critical missing verification gate status", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_acc_01",
      task: "Status task",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.accuracy_critical).toBe(true);
    expect(status.last_review_verification).toBe("missing");
    expect(status.failing_gates).toEqual([
      {
        gate_id: "accuracy_critical.review_verification",
        reason_code: "ACCURACY_CRITICAL_REVIEW_VERIFICATION_MISSING",
        message: "Accuracy-critical review verification status is missing.",
        priority: "P1",
        timing: "required-now",
        layer: "L1",
        signal_level: "warning"
      }
    ]);
  });

  it("reports invalid verification artifact diagnostics", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_acc_02",
      task: "Status task",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });
    await writeFile(
      bubble.paths.reviewVerificationArtifactPath,
      "{ not-json",
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.last_review_verification).toBe("invalid");
    expect(status.failing_gates).toEqual([
      {
        gate_id: "accuracy_critical.review_verification",
        reason_code: "ACCURACY_CRITICAL_REVIEW_VERIFICATION_INVALID",
        message: "Accuracy-critical review verification status is invalid.",
        priority: "P1",
        timing: "required-now",
        layer: "L1",
        signal_level: "warning"
      }
    ]);
  });

  it("reports stale-round verification artifact diagnostics", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_acc_03",
      task: "Status task",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });
    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T14:20:00.000Z")
    });
    await writeFile(
      verificationInput,
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
    await emitPassFromWorkspace({
      summary: "Review pass 1 clean",
      noFindings: true,
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T14:21:00.000Z")
    });
    await writeFile(
      bubble.paths.reviewVerificationArtifactPath,
      `${JSON.stringify(
        {
          schema: "review_verification_v1",
          overall: "pass",
          claims: [
            {
              claim_id: "C1",
              status: "verified",
              evidence_refs: ["src/a.ts:1"]
            }
          ],
          input_ref: "review-verification-input.json",
          meta: {
            bubble_id: bubble.bubbleId,
            round: 1,
            reviewer: bubble.config.agents.reviewer,
            generated_at: "2026-02-22T14:21:30.000Z"
          },
          validation: {
            status: "valid",
            errors: []
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.last_review_verification).toBe("invalid");
    expect(status.failing_gates).toEqual([
      {
        gate_id: "accuracy_critical.review_verification",
        reason_code: "ACCURACY_CRITICAL_REVIEW_VERIFICATION_INVALID",
        message: "Accuracy-critical review verification status is invalid.",
        priority: "P1",
        timing: "required-now",
        layer: "L1",
        signal_level: "warning"
      }
    ]);
  });

  it("ignores doc-gate artifact diagnostics for non-document scope bubbles", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_scope_non_doc_01",
      task: "Status scope compatibility"
    });

    await writeFile(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir),
      `${JSON.stringify(
        {
          schema_version: 1,
          updated_at: "2026-03-05T14:40:00.000Z",
          task_warnings: [
            {
              gate_id: "task_contract.minimum_presence",
              reason_code: "DOC_CONTRACT_PARSE_WARNING",
              message: "should be ignored in non-doc scope",
              priority: "P2",
              timing: "later-hardening",
              layer: "L0",
              signal_level: "warning"
            }
          ],
          config_warnings: [],
          review_warnings: [
            {
              gate_id: "review_round.policy",
              reason_code: "ROUND_GATE_WARNING",
              message: "should be ignored in non-doc scope",
              priority: "P2",
              timing: "later-hardening",
              layer: "L1",
              signal_level: "warning"
            }
          ],
          finding_evaluations: [],
          round_gate_state: {
            applies: true,
            violated: true,
            round: 5,
            reason_code: "ROUND_GATE_WARNING"
          },
          spec_lock_state: {
            state: "LOCKED",
            open_blocker_count: 3,
            open_required_now_count: 5
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.failing_gates).toEqual([]);
    expect(status.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    });
    expect(status.round_gate_state).toEqual({
      applies: false,
      violated: false,
      round: 1
    });
  });

  it("consumes doc-gate artifact diagnostics for document scope bubbles", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_scope_doc_01",
      task: "Status scope document",
      reviewArtifactType: "document"
    });

    await writeFile(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir),
      `${JSON.stringify(
        {
          schema_version: 1,
          updated_at: "2026-03-05T14:41:00.000Z",
          task_warnings: [],
          config_warnings: [],
          review_warnings: [
            {
              gate_id: "review_round.policy",
              reason_code: "ROUND_GATE_WARNING",
              message: "document scope warning",
              priority: "P2",
              timing: "later-hardening",
              layer: "L1",
              signal_level: "warning"
            }
          ],
          finding_evaluations: [],
          round_gate_state: {
            applies: true,
            violated: true,
            round: 3,
            reason_code: "ROUND_GATE_WARNING"
          },
          spec_lock_state: {
            state: "LOCKED",
            open_blocker_count: 1,
            open_required_now_count: 2
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.failing_gates).toEqual([
      {
        gate_id: "review_round.policy",
        reason_code: "ROUND_GATE_WARNING",
        message: "document scope warning",
        priority: "P2",
        timing: "later-hardening",
        layer: "L1",
        signal_level: "warning"
      }
    ]);
    expect(status.spec_lock_state).toEqual({
      state: "LOCKED",
      open_blocker_count: 1,
      open_required_now_count: 2
    });
    expect(status.round_gate_state).toEqual({
      applies: true,
      violated: true,
      round: 3,
      reason_code: "ROUND_GATE_WARNING"
    });
  });

  it("keeps fallback defaults without warning when doc-gate artifact is missing (ENOENT)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_scope_doc_missing_artifact_01",
      task: "Status scope document missing artifact",
      reviewArtifactType: "document"
    });
    await rm(resolveDocContractGateArtifactPath(bubble.paths.artifactsDir), {
      force: true
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.failing_gates).toEqual([]);
    expect(status.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    });
    expect(status.round_gate_state).toEqual({
      applies: false,
      violated: false,
      round: 1
    });
  });

  it("emits serialization warning and uses fallback defaults when doc-gate artifact is corrupt", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_scope_doc_corrupt_artifact_01",
      task: "Status scope document corrupt artifact",
      reviewArtifactType: "document"
    });
    await writeFile(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir),
      "{invalid-json",
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.failing_gates).toEqual([
      expect.objectContaining({
        gate_id: "status.serialization",
        reason_code: "STATUS_GATE_SERIALIZATION_WARNING"
      })
    ]);
    expect(status.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    });
    expect(status.round_gate_state).toEqual({
      applies: false,
      violated: false,
      round: 1
    });
  });
});
