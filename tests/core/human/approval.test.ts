import { mkdtemp, rm, writeFile as writeFileFs } from "node:fs/promises";
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
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/core/protocol/transcriptStore.js";
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

  it("keeps parity override guard active in legacy READY_FOR_APPROVAL compatibility path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_legacy_parity_override_01",
      task: "Legacy READY_FOR_APPROVAL parity override"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const legacyReadyState = applyStateTransition(loaded.state, {
      to: "READY_FOR_APPROVAL",
      lastCommandAt: "2026-02-22T12:04:00.000Z"
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...legacyReadyState,
        meta_review: {
          ...(legacyReadyState.meta_review ?? {
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
          last_autonomous_run_id: "run_legacy_parity_override_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Legacy READY_FOR_APPROVAL parity guard.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_updated_at: "2026-02-22T12:03:59.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T12:04:30.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: legacyReadyState.round,
        payload: {
          summary: "Legacy readiness with parity inconsistency metadata.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "status",
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: "approve",
            findings_parity_status: "guard_failed"
          }
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      })
    ).rejects.toThrow(/APPROVAL_PARITY_OVERRIDE_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Legacy parity inconsistency manually accepted.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:01.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      findings_parity_inconsistent: true,
      override_non_approve: true
    });
  });

  it("keeps sticky run-failed override behavior symmetric in legacy READY_FOR_APPROVAL compatibility path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_legacy_sticky_run_failed_01",
      task: "Legacy READY_FOR_APPROVAL sticky run-failed compatibility"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const legacyReadyState = applyStateTransition(loaded.state, {
      to: "READY_FOR_APPROVAL",
      lastCommandAt: "2026-02-22T12:04:00.000Z"
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...legacyReadyState,
        meta_review: {
          ...(legacyReadyState.meta_review ?? {
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
          sticky_human_gate: true,
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T12:04:30.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: legacyReadyState.round,
        payload: {
          summary: "META_REVIEW_GATE_RUN_FAILED: legacy sticky gate fallback context",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "status",
            actor: "meta-reviewer",
            actor_agent: "codex"
          }
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Legacy sticky run-failed fallback manually accepted.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:01.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true
    });
  });

  it("falls back to inconclusive instead of recommendation-unavailable on legacy sticky compatibility path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_legacy_sticky_missing_recommendation_01",
      task: "Legacy READY_FOR_APPROVAL sticky compatibility fallback"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const legacyReadyState = applyStateTransition(loaded.state, {
      to: "READY_FOR_APPROVAL",
      lastCommandAt: "2026-02-22T12:04:00.000Z"
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...legacyReadyState,
        meta_review: {
          ...(legacyReadyState.meta_review ?? {
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
          sticky_human_gate: true,
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T12:04:30.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: legacyReadyState.round,
        payload: {
          summary: "Legacy sticky compatibility request without recommendation fields.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "status",
            actor: "meta-reviewer",
            actor_agent: "codex"
          }
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    let caught: unknown;
    try {
      await emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApprovalCommandError);
    const message = (caught as Error).message;
    expect(message).toMatch(/APPROVAL_OVERRIDE_REQUIRED/u);
    expect(message).not.toMatch(/APPROVAL_RECOMMENDATION_UNAVAILABLE/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Legacy sticky compatibility fallback manually accepted.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:01.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true
    });
  });

  it("uses deterministic inconclusive fallback on sticky READY_FOR_HUMAN_APPROVAL compatibility path", async () => {
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

    let caught: unknown;
    try {
      await emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApprovalCommandError);
    const message = (caught as Error).message;
    expect(message).toMatch(/APPROVAL_OVERRIDE_REQUIRED/u);
    expect(message).not.toMatch(/APPROVAL_RECOMMENDATION_UNAVAILABLE/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Sticky compatibility fallback manually accepted.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:01.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true
    });
  });

  it("uses inconclusive fallback when sticky context has no current-round approval request", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(
      repoPath,
      "b_approval_run_failed_history_scope_01"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        round: loaded.state.round + 1,
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
          sticky_human_gate: true,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_run_id: null,
          last_autonomous_updated_at: null,
          last_autonomous_rework_target_message: null
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "READY_FOR_HUMAN_APPROVAL"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T12:04:30.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 0,
        payload: {
          summary: "META_REVIEW_GATE_RUN_FAILED: historical gate failure"
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    let caught: unknown;
    try {
      await emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:00.000Z")
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ApprovalCommandError);
    const message = (caught as Error).message;
    expect(message).toMatch(/APPROVAL_OVERRIDE_REQUIRED/u);
    expect(message).not.toMatch(/APPROVAL_RECOMMENDATION_UNAVAILABLE/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Sticky context had no current-round approval request; accepted manually.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:01.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true
    });
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

  it("requires override when latest approval request carries parity inconsistency metadata", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(
      repoPath,
      "b_approval_parity_override_01"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot to exist.");
    }
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...loaded.state.meta_review,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Autonomous gate approve with parity guard warning.",
          last_autonomous_updated_at: "2026-02-22T12:05:30.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "READY_FOR_HUMAN_APPROVAL"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T12:05:31.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: loaded.state.round,
        payload: {
          summary: "Parity metadata unresolved; explicit human override required.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "status",
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: "approve",
            findings_parity_status: "guard_failed"
          }
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:32.000Z")
      })
    ).rejects.toThrow(/APPROVAL_PARITY_OVERRIDE_REQUIRED/u);

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        overrideNonApprove: true,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:32.500Z")
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REASON_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Human accepted parity inconsistency for this round.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:33.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      findings_parity_inconsistent: true,
      override_non_approve: true
    });
  });

  it("requires override when parity counts are inconsistent even if parity status is ok", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForHumanApprovalBubble(
      repoPath,
      "b_approval_parity_count_mismatch_override_01"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot to exist.");
    }
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...loaded.state.meta_review,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Autonomous approve with count mismatch parity metadata.",
          last_autonomous_updated_at: "2026-02-22T12:05:35.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "READY_FOR_HUMAN_APPROVAL"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T12:05:36.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: loaded.state.round,
        payload: {
          summary: "Parity counts are inconsistent but status is marked ok.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "status",
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: "approve",
            findings_claimed_open_total: 2,
            findings_artifact_open_total: 1,
            findings_parity_status: "ok"
          }
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:37.000Z")
      })
    ).rejects.toThrow(/APPROVAL_PARITY_OVERRIDE_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Count mismatch parity metadata was manually reviewed and accepted.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:38.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      findings_parity_inconsistent: true,
      override_non_approve: true
    });
  });

  it("keeps parity override guard active for META_REVIEW_FAILED approvals", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_meta_review_failed_parity_override_01",
      task: "META_REVIEW_FAILED parity override guard"
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for META_REVIEW_FAILED parity guard.",
        now: new Date("2026-02-22T12:05:34.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => ({
          updated: true,
          record: {
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_approval_test",
            updatedAt: "2026-02-22T12:05:34.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active,
              updatedAt: "2026-02-22T12:05:34.000Z"
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

    const failedLoaded = await readStateSnapshot(bubble.paths.statePath);
    expect(failedLoaded.state.state).toBe("META_REVIEW_FAILED");
    if (failedLoaded.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot to exist in META_REVIEW_FAILED.");
    }

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T12:05:36.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: failedLoaded.state.round,
        payload: {
          summary: "META_REVIEW_FAILED route with unresolved findings parity.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "status",
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: "approve",
            findings_parity_status: "guard_failed"
          }
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:05:37.000Z")
      })
    ).rejects.toThrow(/APPROVAL_PARITY_OVERRIDE_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "META_REVIEW_FAILED parity inconsistency manually accepted.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:38.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      findings_parity_inconsistent: true,
      override_non_approve: true
    });
  });

  it("keeps parity override guard active after sticky human-gate bypass", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_approval_sticky_parity_override_01",
      task: "Sticky bypass parity override guard"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
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
          sticky_human_gate: true,
          last_autonomous_run_id: "run_sticky_parity_override_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Sticky bypass should preserve parity metadata.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_updated_at: "2026-02-22T12:06:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(
        {
          bubble_id: bubble.bubbleId,
          run_id: "run_sticky_parity_override_01",
          report_json: {
            findings_count: 2,
            findings_claimed_open_total: 2,
            findings_artifact_open_total: 1,
            findings_artifact_status: "available",
            findings_digest_sha256:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            meta_review_run_id: "run_sticky_parity_override_01",
            findings_parity_status: "guard_failed"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const gate = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged for sticky bypass parity override.",
      now: new Date("2026-02-22T12:06:01.000Z")
    });
    expect(gate.route).toBe("human_gate_sticky_bypass");
    expect(gate.gateEnvelope.payload.metadata).toMatchObject({
      findings_parity_status: "guard_failed",
      meta_review_run_id: "run_sticky_parity_override_01"
    });

    await expect(
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:06:02.000Z")
      })
    ).rejects.toThrow(/APPROVAL_PARITY_OVERRIDE_REQUIRED/u);

    const approved = await emitApprove({
      bubbleId: bubble.bubbleId,
      overrideNonApprove: true,
      overrideReason: "Sticky bypass parity inconsistency reviewed and accepted.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:06:03.000Z")
    });
    expect(approved.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(approved.envelope.payload.metadata).toMatchObject({
      findings_parity_inconsistent: true,
      override_non_approve: true
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
