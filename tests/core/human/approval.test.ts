import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import {
  emitApprove,
  emitRequestRework,
  ApprovalCommandError
} from "../../../src/core/human/approval.js";
import {
  applyMetaReviewGateOnConvergence,
  MetaReviewGateError,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-approval-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupReadyForHumanApprovalBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Implement + review"
  });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:03:00.000Z")
  });
  await emitConvergedFromWorkspace({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:04:00.000Z")
  }, {
    applyMetaReviewGateOnConvergence: async (input) =>
      applyMetaReviewGateOnConvergence(input, {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => ({
          updated: true,
          record: {
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_approval_test",
            updatedAt: "2026-02-22T12:04:00.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active,
              updatedAt: "2026-02-22T12:04:00.000Z"
            }
          }
        }),
        notifyMetaReviewerSubmissionRequest: async () => {}
      })
  });

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const updatedAt = "2026-02-22T12:04:00.000Z";
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      meta_review: {
        ...(loaded.state.meta_review ?? {
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }),
        last_autonomous_run_id: null,
        last_autonomous_status: "inconclusive",
        last_autonomous_recommendation: "inconclusive",
        last_autonomous_summary: "Autonomous review inconclusive; route to human gate.",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: updatedAt
      }
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "META_REVIEW_RUNNING"
    }
  );

  await recoverMetaReviewGateFromSnapshot({
    bubbleId: bubble.bubbleId,
    repoPath,
    summary: "Ready for approval",
    now: new Date("2026-02-22T12:04:01.000Z")
  });

  const recoveredState = await readStateSnapshot(bubble.paths.statePath);
  const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
  const gateEnvelope = transcript.at(-1);
  expect(gateEnvelope?.type).toBe("APPROVAL_REQUEST");
  if (gateEnvelope?.type === "APPROVAL_REQUEST") {
    expect(gateEnvelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      actor: "meta-reviewer",
      actor_agent: "codex",
      latest_recommendation: "inconclusive"
    });
    expect(gateEnvelope.payload.metadata?.latest_recommendation).toBe(
      recoveredState.state.meta_review?.last_autonomous_recommendation
    );
  }

  return bubble;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("approval decisions", () => {
  it("rejects approve decision when non-approve recommendation lacks override", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(repoPath, "b_approval_00");

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REQUIRED/u);
  });

  it("writes APPROVAL_DECISION=approve with override metadata and transitions to APPROVED_FOR_COMMIT", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(repoPath, "b_approval_01");

    const result = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Human verified blocker context manually.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:00.000Z")
    });

    expect(result.envelope.type).toBe("APPROVAL_DECISION");
    expect(result.envelope.payload.decision).toBe("approve");
    expect(result.envelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      recommendation_at_decision: "inconclusive",
      override_non_approve: true,
      override_reason: "Human verified blocker context manually."
    });
    expect(result.state.state).toBe("APPROVED_FOR_COMMIT");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("APPROVAL_DECISION");

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.map((entry) => entry.type)).toEqual([
      "TASK",
      "APPROVAL_REQUEST",
      "APPROVAL_DECISION"
    ]);
  });

  it("requires non-empty override reason when override flag is set", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(repoPath, "b_approval_01b");

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        overrideNonApprove: true,
        overrideReason: "   ",
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REASON_REQUIRED/u);
  });

  it("emits absolute transcript messageRef for APPROVAL_DECISION=approve delivery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(repoPath, "b_approval_05");
    const deliveries: Array<{
      recipient: string;
      type: string;
      messageRef: string;
      deliveryTargetRole?: unknown;
    }> = [];

    const result = await emitApprove(
      {
        bubbleId: bubble.bubbleId,
        overrideNonApprove: true,
        overrideReason: "Human override for audit delivery coverage.",
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          if (input.messageRef === undefined) {
            throw new Error("Expected messageRef for approval delivery.");
          }
          deliveries.push({
            recipient: input.envelope.recipient,
            type: input.envelope.type,
            messageRef: input.messageRef,
            deliveryTargetRole:
              input.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey]
          });
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    const expectedRef = `${bubble.paths.transcriptPath}#${result.envelope.id}`;
    expect(deliveries).toEqual([
      {
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        messageRef: expectedRef,
        deliveryTargetRole: "status"
      }
    ]);
  });

  it("writes APPROVAL_DECISION=revise and resumes RUNNING on implementer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(repoPath, "b_approval_02");
    const deliveries: Array<{
      recipient: string;
      messageRef?: string;
      type: string;
      decision?: unknown;
      deliveryTargetRole?: unknown;
    }> = [];

    const result = await emitRequestRework(
      {
        bubbleId: bubble.bubbleId,
        message: "Please tighten validation and add edge-case tests.",
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          deliveries.push({
            recipient: input.envelope.recipient,
            type: input.envelope.type,
            decision: input.envelope.payload.decision,
            deliveryTargetRole:
              input.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey],
            ...(input.messageRef !== undefined
              ? { messageRef: input.messageRef }
              : {})
          });
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(result.mode).toBe("immediate");
    if (result.mode !== "immediate") {
      throw new Error("Expected immediate rework decision result.");
    }
    expect(result.envelope.type).toBe("APPROVAL_DECISION");
    expect(result.envelope.payload.decision).toBe("revise");
    expect(result.envelope.payload.message).toContain("tighten validation");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.active_agent).toBe(bubble.config.agents.implementer);
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(3);
    expect(result.state.round_role_history.some((entry) => entry.round === 3)).toBe(
      true
    );
    expect(deliveries.map((delivery) => delivery.recipient)).toEqual([
      "orchestrator",
      bubble.config.agents.implementer
    ]);
    const expectedRef = `${bubble.paths.transcriptPath}#${result.envelope.id}`;
    expect(deliveries[0]).toMatchObject({
      recipient: "orchestrator",
      type: "APPROVAL_DECISION",
      decision: "revise",
      messageRef: expectedRef,
      deliveryTargetRole: "status"
    });
    expect(deliveries[1]).toMatchObject({
      recipient: bubble.config.agents.implementer,
      type: "APPROVAL_DECISION",
      decision: "revise",
      messageRef: expectedRef,
      deliveryTargetRole: "implementer"
    });
  });

  it("preserves sticky_human_gate through human rework cycle", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(
      repoPath,
      "b_approval_sticky_01"
    );
    const before = await readStateSnapshot(bubble.paths.statePath);
    expect(before.state.meta_review?.sticky_human_gate).toBe(true);

    const result = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Human requested another rework cycle.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:30.000Z")
    });

    expect(result.mode).toBe("immediate");
    if (result.mode !== "immediate") {
      throw new Error("Expected immediate human rework result.");
    }
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.meta_review?.sticky_human_gate).toBe(true);
  });

  it("accepts legacy READY_FOR_APPROVAL as compatibility input path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_legacy_01",
      task: "Legacy approval state compatibility"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const legacyReadyState = applyStateTransition(loaded.state, {
      to: "READY_FOR_APPROVAL",
      lastCommandAt: "2026-02-22T12:04:00.000Z"
    });
    const legacyStateWithoutMetaReview = { ...legacyReadyState };
    delete legacyStateWithoutMetaReview.meta_review;
    await writeStateSnapshot(bubble.paths.statePath, legacyStateWithoutMetaReview, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:00.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
  });

  it("fails closed when recommendation lookup is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(
      repoPath,
      "b_approval_missing_recommendation"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot to exist.");
    }
    const missingRecommendationState = {
      ...loaded.state,
      meta_review: {
        ...loaded.state.meta_review,
        last_autonomous_status: null,
        last_autonomous_recommendation: null,
        last_autonomous_summary: null,
        last_autonomous_report_ref: null,
        last_autonomous_run_id: null,
        last_autonomous_updated_at: null,
        last_autonomous_rework_target_message: null
      }
    };
    await writeStateSnapshot(bubble.paths.statePath, missingRecommendationState, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "READY_FOR_HUMAN_APPROVAL"
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      })
    ).rejects.toThrow(/APPROVAL_RECOMMENDATION_UNAVAILABLE/u);
  });

  it("supports override-based approve after human_gate_run_failed fallback", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_run_failed_fallback_01",
      task: "Human gate run failed fallback"
    });

    await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-08T11:50:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => ({
          updated: true,
          record: {
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_approval_test",
            updatedAt: "2026-03-08T11:50:00.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active,
              updatedAt: "2026-03-08T11:50:00.000Z"
            }
          }
        }),
        notifyMetaReviewerSubmissionRequest: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_RUN_FAILED",
            "simulated runner invocation failure"
          );
        }
      }
    );

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-08T11:51:00.000Z")
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Gate runner failed; human reviewed and approved manually.",
      cwd: repoPath,
      now: new Date("2026-03-08T11:52:00.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true,
      override_reason: "Gate runner failed; human reviewed and approved manually."
    });
  });

  it("keeps override path available after run-failed -> revise -> rerun-failed cycle", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_run_failed_sticky_cycle_01",
      task: "Human gate run-failed sticky cycle"
    });

    await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged first time.",
        now: new Date("2026-03-08T12:00:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => ({
          updated: true,
          record: {
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_approval_test",
            updatedAt: "2026-03-08T12:00:00.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active,
              updatedAt: "2026-03-08T12:00:00.000Z"
            }
          }
        }),
        notifyMetaReviewerSubmissionRequest: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_RUN_FAILED",
            "simulated runner invocation failure"
          );
        }
      }
    );

    const afterFailedGate = await readStateSnapshot(bubble.paths.statePath);
    if (afterFailedGate.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot after run-failed gate.");
    }
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...afterFailedGate.state,
        meta_review: {
          ...afterFailedGate.state.meta_review,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_run_id: null,
          last_autonomous_report_ref: null,
          last_autonomous_updated_at: null,
          last_autonomous_rework_target_message: null
        }
      },
      {
        expectedFingerprint: afterFailedGate.fingerprint,
        expectedState: "META_REVIEW_FAILED"
      }
    );

    const revised = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Need one more implementation cycle.",
      cwd: repoPath,
      now: new Date("2026-03-08T12:01:00.000Z")
    });
    expect(revised.mode).toBe("immediate");
    if (revised.mode !== "immediate") {
      throw new Error("Expected immediate revise result.");
    }
    expect(revised.state.state).toBe("RUNNING");

    const rerunFailedGate = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged after revise.",
      now: new Date("2026-03-08T12:02:00.000Z")
    });
    expect(rerunFailedGate.route).toBe("human_gate_run_failed");
    expect(rerunFailedGate.state.state).toBe("META_REVIEW_FAILED");
    expect(rerunFailedGate.state.meta_review?.sticky_human_gate).toBe(false);
    expect(rerunFailedGate.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_RUN_FAILED"
    );

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-08T12:03:00.000Z")
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Run-failed lineage requires human override after sticky bypass.",
      cwd: repoPath,
      now: new Date("2026-03-08T12:04:00.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true
    });
  });

  it("does not require override when latest recommendation is approve", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(
      repoPath,
      "b_approval_recommendation_approve"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot to exist.");
    }
    const approveRecommendationState = {
      ...loaded.state,
      meta_review: {
        ...loaded.state.meta_review,
        last_autonomous_status: "success" as const,
        last_autonomous_recommendation: "approve" as const,
        last_autonomous_summary: "Autonomous gate approved.",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_run_id: "run_approve_path_01",
        last_autonomous_updated_at: "2026-02-22T12:04:59.000Z"
      }
    };
    await writeStateSnapshot(bubble.paths.statePath, approveRecommendationState, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "READY_FOR_HUMAN_APPROVAL"
    });

    const result = await emitApprove({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:00.000Z")
    });

    expect(result.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(result.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "approve"
    });
  });

  it("queues deferred rework intent while WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_waiting_01",
      task: "Queue deferred rework"
    });

    await emitAskHumanFromWorkspace({
      question: "Need human clarification before continuing.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T12:10:00.000Z")
    });

    const result = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Please restart implementation with stricter acceptance tests.",
      refs: ["artifact://deferred-rework/context.md"],
      cwd: repoPath,
      now: new Date("2026-02-22T12:11:00.000Z")
    });

    expect(result.mode).toBe("queued");
    if (result.mode !== "queued") {
      throw new Error("Expected queued rework intent result.");
    }

    expect(result.intentId).toMatch(/^intent_/u);
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.state.pending_rework_intent).toMatchObject({
      intent_id: result.intentId,
      status: "pending",
      refs: ["artifact://deferred-rework/context.md"],
      requested_by: "human:request-rework"
    });
    expect(result.state.rework_intent_history).toEqual([]);
  });

  it("supersedes prior pending deferred rework intent with latest-write-wins", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_waiting_02",
      task: "Supersede deferred rework intents"
    });

    await emitAskHumanFromWorkspace({
      question: "Need operator decision before proceeding.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T12:20:00.000Z")
    });

    const first = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "First queued rework intent.",
      refs: ["artifact://deferred-rework/first.md"],
      cwd: repoPath,
      now: new Date("2026-02-22T12:21:00.000Z")
    });
    const second = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Second queued rework intent should supersede first.",
      refs: ["artifact://deferred-rework/second.md"],
      cwd: repoPath,
      now: new Date("2026-02-22T12:22:00.000Z")
    });

    expect(first.mode).toBe("queued");
    expect(second.mode).toBe("queued");
    if (first.mode !== "queued" || second.mode !== "queued") {
      throw new Error("Expected queued deferred rework results.");
    }

    expect(second.supersededIntentId).toBe(first.intentId);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.pending_rework_intent).toMatchObject({
      intent_id: second.intentId,
      status: "pending",
      refs: ["artifact://deferred-rework/second.md"]
    });
    expect(loaded.state.rework_intent_history).toContainEqual(
      expect.objectContaining({
        intent_id: first.intentId,
        status: "superseded",
        refs: ["artifact://deferred-rework/first.md"],
        superseded_by_intent_id: second.intentId
      })
    );
  });

  it("rejects decision when bubble is not READY_FOR_HUMAN_APPROVAL", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_approval_03",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Task",
      cwd: repoPath
    });

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(ApprovalCommandError);

    await expect(
      emitRequestRework({
        bubbleId: bubble.bubbleId,
        message: "Cannot queue from CREATED state.",
        cwd: repoPath
      })
    ).rejects.toThrow(
      "bubble request-rework can only be used while bubble is READY_FOR_HUMAN_APPROVAL"
    );
  });

  it("updates last_command_at when approving", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(repoPath, "b_approval_04");
    const now = new Date("2026-02-22T12:06:00.000Z");

    await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Approval timestamp coverage.",
      cwd: repoPath,
      now
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.last_command_at).toBe(now.toISOString());
  });
});
