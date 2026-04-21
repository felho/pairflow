import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { emitAskHumanFromWorkspaceV11 as emitAskHumanFromWorkspace } from "../../../src/v11/application/askHuman/emitAskHumanV11.js";
import { emitPassFromWorkspaceV11 as emitPassFromWorkspace } from "../../../src/v11/application/pass/emitPassV11.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { emitHumanReplyV11 as emitHumanReply } from "../../../src/v11/application/reply/emitReplyV11.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../../src/v11/application/status/emitStatusV11.js";
import { resolveDocContractGateArtifactPath } from "../../../src/v11/defaults/gates/docContractGateArtifactDefaults.js";
import {
  writeRemoteStateCache,
  readRemoteStateCache,
  writeRemotePointer
} from "../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { appendProtocolEnvelope } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { statusCommandDependencyDefaults } from "../../../src/v11/shared/status/statusCommandDependencyDefaults.js";
import { writeWatchdogPaneActivity } from "../../../src/v11/infrastructure/artifact/watchdog/watchdogPaneActivityStore.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { resolveWorktreePairflowEntrypoint } from "../../../src/v11/shared/command/pairflowCommandPathAssessment.js";
import { metaReviewExecutionContextToRunningContext } from "../../../src/v11/shared/state/executionContext.js";
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
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

async function withFakePairflowOnPath<T>(fn: () => Promise<T>): Promise<T> {
  const fakeBinDir = await mkdtemp(join(tmpdir(), "pairflow-fake-bin-"));
  tempDirs.push(fakeBinDir);
  const fakePairflowPath = join(fakeBinDir, "pairflow");
  await writeFile(fakePairflowPath, "#!/usr/bin/env bash\nexit 0\n", "utf8");
  await chmod(fakePairflowPath, 0o755);

  const originalPath = process.env.PATH;
  process.env.PATH = `${fakeBinDir}:${originalPath ?? ""}`;
  try {
    return await fn();
  } finally {
    process.env.PATH = originalPath;
  }
}

async function withPathWithoutPairflow<T>(fn: () => Promise<T>): Promise<T> {
  const originalPath = process.env.PATH;
  process.env.PATH = "";
  try {
    return await fn();
  } finally {
    process.env.PATH = originalPath;
  }
}

async function setBubbleExecutorRemoteAlias(
  bubbleTomlPath: string,
  remoteAlias = "lab"
): Promise<void> {
  const current = await readFile(bubbleTomlPath, "utf8");
  await writeFile(
    bubbleTomlPath,
    `${current.trimEnd()}\n\n[executor]\ntype = "ssh"\nremote = "${remoteAlias}"\n`,
    "utf8"
  );
}

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
    expect(status.reviewPolicy).toEqual({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      meta_review_auto_rework_min_severity: "P1"
    });
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

  it("surfaces watchdog pane activity timing from runtime health record", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_pane_activity_01",
      task: "Status pane activity task"
    });

    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T14:02:30.000Z",
        pane_hash: "pane-hash-01",
        last_changed_at: "2026-02-22T13:59:40.000Z",
        session_name: "pf-b_status_pane_activity_01",
        target_pane: "pf-b_status_pane_activity_01:0.1",
        last_sample_status: "sampled"
      }
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:03:00.000Z")
    });

    expect(status.paneActivity.readStatus).toBe("ok");
    expect(status.paneActivity.lastChangedAt).toBe("2026-02-22T13:59:40.000Z");
    expect(status.paneActivity.sampledAt).toBe("2026-02-22T14:02:30.000Z");
    expect(status.paneActivity.sinceLastChangedSeconds).toBe(200);
    expect(status.paneActivity.sinceSampledSeconds).toBe(30);
    expect(status.paneActivity.lastSampleStatus).toBe("sampled");
  });

  it("returns inspectable status for RUNNING meta-review authority missing execution_context", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_legacy_meta_01",
      task: "Legacy inspectable status"
    });

    await writeFile(
      bubble.paths.statePath,
      `${JSON.stringify({
        bubble_id: bubble.bubbleId,
        state: "RUNNING",
        round: 1,
        active_agent: "codex",
        active_since: "2026-02-22T14:10:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: "2026-02-22T14:10:00.000Z",
        meta_review: {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:12:00.000Z")
    });

    expect(status.state).toBe("RUNNING");
    expect(status.watchdog.monitored).toBe(false);
    expect(status.pendingInboxItems.total).toBe(0);
    expect(status.stateValidation?.errors).toEqual([
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority"
      }
    ]);
  });

  it("counts only the latest unresolved approval request as pending", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_status_approval_latest_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Status latest approval",
      cwd: repoPath
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T14:12:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 0,
        payload: {
          summary: "Older approval summary"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T14:13:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 0,
        payload: {
          summary: "Latest approval summary"
        },
        refs: []
      }
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.pendingInboxItems.approvalRequests).toBe(1);
    expect(status.pendingInboxItems.total).toBe(1);
    expect(status.transcript.lastMessageType).toBe("APPROVAL_REQUEST");
  });

  it("does not surface transcript-derived meta-review route metadata", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_status_meta_route_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Status meta-review route",
      cwd: repoPath
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T14:14:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 0,
        payload: {
          summary: "Meta-review parity guard blocked auto rework.",
          metadata: {
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: "rework",
            meta_review_gate_route: "human_gate_dispatch_failed"
          }
        },
        refs: []
      }
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: false,
      runtimeDelivery: null
    });
  });

  it("drops stale meta-review runtime delivery from status projection", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_runtime_delivery_stale_01",
      task: "Status stale runtime delivery"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-02-22T14:20:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-02-22T14:20:00.000Z",
        last_command_at: "2026-02-22T14:20:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(executionContext),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
            message: "tmux send failed",
            observed_at: "2026-02-22T14:20:05.000Z",
            observed_for_handoff_id: `${executionContext.handoff_id}_stale`,
            observed_for_round: executionContext.round
          }
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: true,
      runtimeDelivery: null
    });
  });

  it("surfaces active meta-review runtime delivery from status projection", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_runtime_delivery_active_01",
      task: "Status active runtime delivery"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-02-22T14:20:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-02-22T14:20:00.000Z",
        last_command_at: "2026-02-22T14:20:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(executionContext),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
            message: "tmux send failed",
            observed_at: "2026-02-22T14:20:05.000Z",
            observed_for_handoff_id: executionContext.handoff_id,
            observed_for_round: executionContext.round
          }
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: true,
      runtimeDelivery: {
        status: "failed",
        reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
        message: "tmux send failed",
        observedAt: "2026-02-22T14:20:05.000Z",
        observedForHandoffId: executionContext.handoff_id,
        observedForRound: executionContext.round
      }
    });
  });

  it("drops partially correlated meta-review runtime delivery from status projection", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_runtime_delivery_partial_01",
      task: "Status partial runtime delivery"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-02-22T14:20:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeFile(
      bubble.paths.statePath,
      `${JSON.stringify({
        ...loaded.state,
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-02-22T14:20:00.000Z",
        last_command_at: "2026-02-22T14:20:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(executionContext),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
            message: "tmux send failed",
            observed_at: "2026-02-22T14:20:05.000Z",
            observed_for_handoff_id: null,
            observed_for_round: executionContext.round
          }
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: true,
      runtimeDelivery: null
    });
  });

  it("drops reverse-direction partially correlated meta-review runtime delivery from status projection", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_runtime_delivery_partial_reverse_01",
      task: "Status reverse partial runtime delivery"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-02-22T14:20:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeFile(
      bubble.paths.statePath,
      `${JSON.stringify({
        ...loaded.state,
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-02-22T14:20:00.000Z",
        last_command_at: "2026-02-22T14:20:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(executionContext),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
            message: "tmux send failed",
            observed_at: "2026-02-22T14:20:05.000Z",
            observed_for_handoff_id: executionContext.handoff_id,
            observed_for_round: null
          }
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: true,
      runtimeDelivery: null
    });
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

  it("uses external command profile by default and avoids false stale on entrypoint mismatch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_cmd_profile_external_01",
      task: "Status command profile external"
    });
    const localEntrypoint = resolveWorktreePairflowEntrypoint(
      bubble.paths.worktreePath
    );
    await mkdir(join(bubble.paths.worktreePath, "dist", "cli"), {
      recursive: true
    });
    await writeFile(localEntrypoint, "console.log('local pairflow');\n", "utf8");

    const status = await withFakePairflowOnPath(async () =>
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    );

    expect(status.commandPath.profile).toBe("external");
    expect(status.commandPath.status).toBe("external");
    expect(status.commandPath.reasonCode).toBeUndefined();
    expect(status.commandPath.localEntrypoint).toBe(localEntrypoint);
    expect(status.commandPath.message).toContain(
      "external Pairflow command profile active"
    );
  });

  it("reports stale only for self_host command profile", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_cmd_profile_self_host_01",
      task: "Status command profile self_host",
      pairflowCommandProfile: "self_host"
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.commandPath.profile).toBe("self_host");
    expect(status.commandPath.status).toBe("stale");
    expect(status.commandPath.reasonCode).toBe("PAIRFLOW_COMMAND_PATH_STALE");
  });

  it("defaults legacy profile-missing configs to external", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_cmd_profile_legacy_01",
      task: "Status command profile legacy"
    });

    const rawConfig = await readFile(bubble.paths.bubbleTomlPath, "utf8");
    const legacyConfig = rawConfig
      .split("\n")
      .filter((line) => !line.startsWith("pairflow_command_profile = "))
      .join("\n");
    await writeFile(bubble.paths.bubbleTomlPath, legacyConfig, "utf8");

    const status = await withFakePairflowOnPath(async () =>
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    );

    expect(status.commandPath.profile).toBe("external");
    expect(status.commandPath.status).toBe("external");
    expect(status.commandPath.reasonCode).toBeUndefined();
  });

  it("reports missing for external profile when PATH pairflow is unavailable even with resolved active entrypoint", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_cmd_profile_external_missing_01",
      task: "Status command profile external missing"
    });

    const status = await withPathWithoutPairflow(async () =>
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    );

    expect(status.commandPath.profile).toBe("external");
    expect(status.commandPath.status).toBe("missing");
    expect(status.commandPath.reasonCode).toBe(
      "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    );
  });

  it("renders created remote bubbles without SSH status refresh", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_status_remote_created_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote created status",
      cwd: repoPath
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "created",
      host: "ssh.example.com"
    });

    const remoteStatusSpy = vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    );

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(remoteStatusSpy).not.toHaveBeenCalled();
    expect(status.remoteExecution).toMatchObject({
      pointerKind: "created",
      viewKind: "status",
      statusSource: "created_not_started",
      runtimeAvailability: "not_started"
    });
  });

  it("refreshes started remote bubbles from remote status and updates the cache", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_started_01",
      task: "Remote started status"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_started_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_started_01",
      tmuxSession: "pf-b_status_remote_started_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-16T09:50:00.000Z",
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:57:00.000Z",
        sampledAt: "2026-04-16T09:59:30.000Z",
        sinceLastChangedSeconds: 180,
        sinceSampledSeconds: 30,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_remote_started_01",
        targetPane: "pf-b_status_remote_started_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "claude",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:58:00.000Z",
        deadlineTimestamp: "2026-04-16T10:28:00.000Z",
        remainingSeconds: 1500,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 1,
        approvalRequests: 0,
        total: 1
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "HUMAN_QUESTION",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_status_started_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.state).toBe("WAITING_HUMAN");
    expect(status.round).toBe(3);
    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "present",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
      lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
    });
    await expect(readRemoteStateCache(bubble.paths.remoteStateCachePath)).resolves.toMatchObject({
      state: "WAITING_HUMAN",
      round: 3,
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });
  });

  it("keeps live remote status when cache refresh persistence fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_live_cache_write_fail_01",
      task: "Remote live status with cache write failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_live_cache_write_fail_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_live_cache_write_fail_01",
      tmuxSession: "pf-b_status_remote_live_cache_write_fail_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-16T09:50:00.000Z",
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:57:00.000Z",
        sampledAt: "2026-04-16T09:59:30.000Z",
        sinceLastChangedSeconds: 180,
        sinceSampledSeconds: 30,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_remote_live_cache_write_fail_01",
        targetPane: "pf-b_status_remote_live_cache_write_fail_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "claude",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:58:00.000Z",
        deadlineTimestamp: "2026-04-16T10:28:00.000Z",
        remainingSeconds: 1500,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 1,
        approvalRequests: 0,
        total: 1
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "HUMAN_QUESTION",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_live_cache_write_fail_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "writeRemoteStateCache"
    ).mockRejectedValue(new Error("disk full"));

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.state).toBe("WAITING_HUMAN");
    expect(status.round).toBe(3);
    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "missing",
      runtimeAvailability: "active",
      cacheReasonCode: "STATUS_REMOTE_CACHE_WRITE_FAILED",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z"
    });
    expect(status.remoteExecution?.lastCacheCheckAt).toBeUndefined();
  });

  it("preserves stale cache timestamps as explicit fallback provenance when live remote status cache persistence fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_live_cache_write_fail_stale_cache_01",
      task: "Remote live status with stale cache write failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_live_cache_write_fail_stale_cache_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_live_cache_write_fail_stale_cache_01",
      tmuxSession: "pf-b_status_remote_live_cache_write_fail_stale_cache_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:55:00.000Z",
      state: "RUNNING",
      round: 2,
      maxRounds: 5
    });

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-16T09:50:00.000Z",
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:57:00.000Z",
        sampledAt: "2026-04-16T09:59:30.000Z",
        sinceLastChangedSeconds: 180,
        sinceSampledSeconds: 30,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_remote_live_cache_write_fail_stale_cache_01",
        targetPane: "pf-b_status_remote_live_cache_write_fail_stale_cache_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "claude",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:58:00.000Z",
        deadlineTimestamp: "2026-04-16T10:28:00.000Z",
        remainingSeconds: 1500,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 1,
        approvalRequests: 0,
        total: 1
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "HUMAN_QUESTION",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_live_cache_write_fail_stale_cache_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "writeRemoteStateCache"
    ).mockRejectedValue(new Error("disk full"));

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.state).toBe("WAITING_HUMAN");
    expect(status.round).toBe(3);
    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "present",
      runtimeAvailability: "active",
      cacheReasonCode: "STATUS_REMOTE_CACHE_WRITE_FAILED",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
      lastCacheCheckAt: "2026-04-16T09:55:00.000Z"
    });
  });

  it("surfaces invalid cache provenance when live remote status cache persistence fails onto a corrupted cache", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_live_cache_write_fail_invalid_cache_01",
      task: "Remote live status with invalid cache fallback"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_live_cache_write_fail_invalid_cache_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_live_cache_write_fail_invalid_cache_01",
      tmuxSession: "pf-b_status_remote_live_cache_write_fail_invalid_cache_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeFile(bubble.paths.remoteStateCachePath, "{ invalid", "utf8");

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-16T09:50:00.000Z",
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:57:00.000Z",
        sampledAt: "2026-04-16T09:59:30.000Z",
        sinceLastChangedSeconds: 180,
        sinceSampledSeconds: 30,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_remote_live_cache_write_fail_invalid_cache_01",
        targetPane: "pf-b_status_remote_live_cache_write_fail_invalid_cache_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "claude",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:58:00.000Z",
        deadlineTimestamp: "2026-04-16T10:28:00.000Z",
        remainingSeconds: 1500,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 1,
        approvalRequests: 0,
        total: 1
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "HUMAN_QUESTION",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_live_cache_write_fail_invalid_cache_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "writeRemoteStateCache"
    ).mockRejectedValue(new Error("disk full"));

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "invalid",
      runtimeAvailability: "active",
      cacheReasonCode: "STATUS_REMOTE_CACHE_WRITE_FAILED",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z"
    });
    expect(status.remoteExecution?.lastCacheCheckAt).toBeUndefined();
  });

  it("surfaces runtime-loss as explicit remote status metadata without reopening attach semantics", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_runtime_missing_01",
      task: "Remote runtime missing status"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_runtime_missing_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_runtime_missing_01",
      tmuxSession: "pf-b_status_remote_runtime_missing_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "RUNNING",
      round: 3,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-16T09:50:00.000Z",
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "missing",
        lastChangedAt: null,
        sampledAt: null,
        sinceLastChangedSeconds: null,
        sinceSampledSeconds: null,
        lastSampleStatus: null,
        lastSampleError: null,
        sessionName: null,
        targetPane: null
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "claude",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:58:00.000Z",
        deadlineTimestamp: "2026-04-16T10:28:00.000Z",
        remainingSeconds: 1500,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "PASS",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_status_runtime_missing_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "missing",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.state).toBe("RUNNING");
    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "present",
      runtimeAvailability: "missing",
      reasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
      lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
    });
    await expect(readRemoteStateCache(bubble.paths.remoteStateCachePath)).resolves.toMatchObject({
      state: "RUNNING",
      round: 3,
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });
  });

  it("keeps watchdog-expired remote status live when pane proof remains readable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_watchdog_live_01",
      task: "Remote watchdog live status"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_watchdog_live_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_watchdog_live_01",
      tmuxSession: "pf-b_status_remote_watchdog_live_01",
      startedAt: "2026-04-16T09:45:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:45:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-16T09:50:00.000Z",
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:57:00.000Z",
        sampledAt: "2026-04-16T10:00:00.000Z",
        sinceLastChangedSeconds: 180,
        sinceSampledSeconds: 0,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_remote_watchdog_live_01",
        targetPane: "pf-b_status_remote_watchdog_live_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "claude",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:20:00.000Z",
        deadlineTimestamp: "2026-04-16T09:50:00.000Z",
        remainingSeconds: 0,
        expired: true
      },
      pendingInboxItems: {
        humanQuestions: 1,
        approvalRequests: 0,
        total: 1
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "HUMAN_QUESTION",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_status_watchdog_live_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "present",
      runtimeAvailability: "active",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
      lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
    });
    expect(status.watchdog).toMatchObject({
      monitored: true,
      monitoredAgent: "claude",
      expired: true
    });
    expect(status.remoteExecution?.reasonCode).toBeUndefined();
  });

  it("keeps monitored recovery remote status live when watchdog agent identity is null", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_recovery_live_01",
      task: "Remote recovery live status"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_recovery_live_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_recovery_live_01",
      tmuxSession: "pf-b_status_remote_recovery_live_01",
      startedAt: "2026-04-16T09:45:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:45:00.000Z",
      state: "RUNNING",
      round: 3,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:57:00.000Z",
        sampledAt: "2026-04-16T10:00:00.000Z",
        sinceLastChangedSeconds: 180,
        sinceSampledSeconds: 0,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_remote_recovery_live_01",
        targetPane: "pf-b_status_remote_recovery_live_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: null,
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:20:00.000Z",
        deadlineTimestamp: "2026-04-16T09:50:00.000Z",
        remainingSeconds: 0,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "PASS",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_status_recovery_live_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.state).toBe("RUNNING");
    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "present",
      runtimeAvailability: "active",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
      lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
    });
    expect(status.watchdog).toMatchObject({
      monitored: true,
      monitoredAgent: null,
      expired: false
    });
    expect(status.remoteExecution?.reasonCode).toBeUndefined();
  });

  it("fails closed when started remote status refresh is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_unavailable_01",
      task: "Remote unavailable status"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_unavailable_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_unavailable_01",
      tmuxSession: "pf-b_status_remote_unavailable_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:59:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockRejectedValue(new Error("ssh transport failed"));

    await expect(
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toThrow(
      "Failed to load remote status for b_status_remote_unavailable_01: STATUS_REMOTE_STATUS_UNAVAILABLE: ssh transport failed cache_status=present cache_last_checked_at=2026-04-16T09:59:00.000Z."
    );
    await expect(readRemoteStateCache(bubble.paths.remoteStateCachePath)).resolves.toEqual({
      lastCheckedAt: "2026-04-16T09:59:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });
  });

  it("preserves invalid-cache provenance when remote status fails closed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_unavailable_invalid_cache_01",
      task: "Remote unavailable status with invalid cache"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_unavailable_invalid_cache_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_unavailable_invalid_cache_01",
      tmuxSession: "pf-b_status_remote_unavailable_invalid_cache_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeFile(bubble.paths.remoteStateCachePath, "{ invalid", "utf8");

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockRejectedValue(new Error("ssh transport failed"));

    await expect(
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toThrow(
      `Failed to load remote status for ${bubble.bubbleId}: STATUS_REMOTE_STATUS_UNAVAILABLE: ssh transport failed cache_status=invalid.`
    );
  });

  it("surfaces fallback-read provenance when live cache persistence fails and fallback cache cannot be read", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_live_cache_write_fail_read_fail_01",
      task: "Remote live status fallback cache read failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_live_cache_write_fail_read_fail_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_live_cache_write_fail_read_fail_01",
      tmuxSession: "pf-b_status_remote_live_cache_write_fail_read_fail_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-16T09:50:00.000Z",
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:57:00.000Z",
        sampledAt: "2026-04-16T09:59:30.000Z",
        sinceLastChangedSeconds: 180,
        sinceSampledSeconds: 30,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_remote_live_cache_write_fail_read_fail_01",
        targetPane: "pf-b_status_remote_live_cache_write_fail_read_fail_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "claude",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T09:58:00.000Z",
        deadlineTimestamp: "2026-04-16T10:28:00.000Z",
        remainingSeconds: 1500,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 1,
        approvalRequests: 0,
        total: 1
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "HUMAN_QUESTION",
        lastMessageTs: "2026-04-16T09:58:00.000Z",
        lastMessageId: "msg_remote_live_cache_write_fail_read_fail_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      accuracyCritical: false,
      lastReviewVerification: "missing",
      failingGates: [],
      specLockState: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      roundGateState: {
        applies: false,
        violated: false,
        round: 3
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "writeRemoteStateCache"
    ).mockRejectedValue(new Error("disk full"));
    vi.spyOn(
      statusCommandDependencyDefaults,
      "readRemoteStateCache"
    ).mockRejectedValue(new Error("EIO"));

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(status.remoteExecution).toMatchObject({
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "missing",
      runtimeAvailability: "active",
      cacheReasonCode: "STATUS_REMOTE_CACHE_FALLBACK_READ_FAILED",
      lastLiveCheckAt: "2026-04-16T10:00:00.000Z"
    });
    expect(status.remoteExecution?.lastCacheCheckAt).toBeUndefined();
  });

  it("surfaces explicit cache-read provenance when remote status fails closed and cache fallback cannot be read", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_unavailable_cache_read_fail_01",
      task: "Remote unavailable status with cache read failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_unavailable_cache_read_fail_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_unavailable_cache_read_fail_01",
      tmuxSession: "pf-b_status_remote_unavailable_cache_read_fail_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      statusCommandDependencyDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      statusCommandDependencyDefaults,
      "executeRemoteBubbleStatus"
    ).mockRejectedValue(new Error("ssh transport failed"));
    vi.spyOn(
      statusCommandDependencyDefaults,
      "readRemoteStateCache"
    ).mockRejectedValue(new Error("EIO"));

    await expect(
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toThrow(
      `Failed to load remote status for ${bubble.bubbleId}: STATUS_REMOTE_STATUS_UNAVAILABLE: ssh transport failed cache_status=read_failed cache_reason=STATUS_REMOTE_CACHE_READ_FAILED.`
    );
  });

  it("does not duplicate the remote status unavailable prefix when alias resolution fails early", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_status_remote_missing_alias_01",
      task: "Remote missing alias status"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_missing_alias_01",
      remoteClonePath: "/srv/pairflow/repo--b_status_remote_missing_alias_01",
      tmuxSession: "pf-b_status_remote_missing_alias_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });

    await expect(
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toThrow(
      "Failed to load remote status for b_status_remote_missing_alias_01: STATUS_REMOTE_STATUS_UNAVAILABLE: Bubble b_status_remote_missing_alias_01 has remote execution artifacts without an ssh executor alias in bubble.toml. cache_status=missing."
    );
    await expect(
      getBubbleStatus({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.not.toThrow(
      /STATUS_REMOTE_STATUS_UNAVAILABLE: Failed to load remote status for .*STATUS_REMOTE_STATUS_UNAVAILABLE:/u
    );
  });
});
