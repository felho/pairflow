import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import type { BubbleMetaReviewSnapshotState } from "../../../src/types/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-"));
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

function buildBoundMetaReviewerPaneResult(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  active: boolean;
}) {
  return {
    updated: true as const,
    record: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      tmuxSessionName: "pf_meta_structured",
      updatedAt: "2026-03-10T10:00:00.000Z",
      metaReviewerPane: {
        role: "meta-reviewer" as const,
        paneIndex: 3,
        active: input.active,
        updatedAt: "2026-03-10T10:00:00.000Z"
      }
    }
  };
}

function defaultMetaReviewSnapshot(): BubbleMetaReviewSnapshotState {
  return {
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
  };
}

async function startAsyncMetaReviewGate(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  summary: string;
  now: Date;
}) {
  return applyMetaReviewGateOnConvergence(
    {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      summary: input.summary,
      now: input.now
    },
    {
      setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
        buildBoundMetaReviewerPaneResult({
          bubbleId: targetBubbleId,
          repoPath: input.repoPath,
          worktreePath: input.worktreePath,
          active
        }),
      notifyMetaReviewerSubmissionRequest: async () => {}
    }
  );
}

async function writeCanonicalMetaReviewSnapshot(input: {
  statePath: string;
  recommendation: "approve" | "rework" | "inconclusive";
  summary: string;
  updatedAt: string;
  reworkTargetMessage?: string | null;
}) {
  const loaded = await readStateSnapshot(input.statePath);
  await writeStateSnapshot(
    input.statePath,
    {
      ...loaded.state,
      meta_review: {
        ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
        last_autonomous_run_id: null,
        last_autonomous_status:
          input.recommendation === "inconclusive" ? "inconclusive" : "success",
        last_autonomous_recommendation: input.recommendation,
        last_autonomous_summary: input.summary,
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message:
          input.reworkTargetMessage ?? null,
        last_autonomous_updated_at: input.updatedAt
      }
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "META_REVIEW_RUNNING"
    }
  );
}

describe("applyMetaReviewGateOnConvergence", () => {
  it("starts async meta-review and emits TASK kickoff when pane is available", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_01",
      task: "Async gate start"
    });
    const notifySpy = vi.fn(async () => {});

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:00:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          }),
        notifyMetaReviewerSubmissionRequest: notifySpy
      }
    );

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "meta_reviewer"
    });
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.state.active_role).toBe("meta_reviewer");
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it("routes to human_gate_run_failed when pane binding is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_02",
      task: "Async gate run-failed fallback"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:01:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async () => ({
          updated: false as const,
          reason: "no_runtime_session" as const
        })
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_RUN_FAILED"
    );
  });

  it("routes to human_gate_run_failed when structured submit request delivery fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_03",
      task: "Async gate notify failure"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:02:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          }),
        notifyMetaReviewerSubmissionRequest: async () => {
          throw new Error("tmux send failed");
        }
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("bypasses meta-review run when sticky_human_gate is already true", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_sticky_01",
      task: "Sticky gate bypass"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true,
          last_autonomous_status: "inconclusive",
          last_autonomous_recommendation: "inconclusive",
          last_autonomous_summary: "Sticky human gate active.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_updated_at: "2026-03-12T12:03:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged for meta-review.",
      now: new Date("2026-03-12T12:03:10.000Z")
    });

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
  });
});

describe("recoverMetaReviewGateFromSnapshot", () => {
  it("routes approve snapshot to human gate", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_01",
      task: "Recover approve"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:10:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:02.000Z")
    });
    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
  });

  it("routes inconclusive snapshot to human gate", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_inconclusive_01",
      task: "Recover inconclusive"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:11:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "inconclusive",
      summary: "Inconclusive recommendation.",
      updatedAt: "2026-03-12T12:11:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:11:02.000Z")
    });
    expect(recovered.route).toBe("human_gate_inconclusive");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
  });

  it("routes rework snapshot to auto_rework and increments auto_rework_count", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_01",
      task: "Recover rework"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "rework",
      summary: "Need one more rework.",
      reworkTargetMessage: "Fix edge-case behavior.",
      updatedAt: "2026-03-12T12:12:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:02.000Z")
    });
    expect(recovered.route).toBe("auto_rework");
    expect(recovered.state.state).toBe("RUNNING");
    expect(recovered.state.active_role).toBe("implementer");
    expect(recovered.state.meta_review?.auto_rework_count).toBe(1);
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(recovered.gateEnvelope.payload.decision).toBe("revise");
  });

  it("routes to human_gate_dispatch_failed when rework snapshot has no target message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_02",
      task: "Recover rework missing target"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:13:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "rework",
      summary: "Need rework but missing message.",
      reworkTargetMessage: "snapshot message",
      updatedAt: "2026-03-12T12:13:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:13:02.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          status: "success",
          recommendation: "rework",
          summary: "Need rework but missing message.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:13:01.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      }
    );
    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
  });

  it("routes error status to META_REVIEW_FAILED with human_gate_run_failed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_error_01",
      task: "Recover error"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "inconclusive",
      summary: "Runner failed.",
      updatedAt: "2026-03-12T12:14:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:14:02.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          status: "error",
          recommendation: "inconclusive",
          summary: "Runner failed.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:14:01.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      }
    );
    expect(recovered.route).toBe("human_gate_run_failed");
    expect(recovered.state.state).toBe("META_REVIEW_FAILED");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
  });

  it("throws state conflict when runResult differs from canonical snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_conflict_01",
      task: "Recover conflict"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:15:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:15:01.000Z"
    });

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:15:02.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          status: "success",
          recommendation: "approve",
          summary: "Approve recommendation.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:15:05.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
  });

  it("deactivates meta-review pane binding after recovery route", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_deactivate_01",
      task: "Recover deactivation"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:16:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:16:01.000Z"
    });

    const setPaneSpy = vi.fn(async ({ bubbleId: targetBubbleId, active }: {
      bubbleId: string;
      active: boolean;
    }) =>
      buildBoundMetaReviewerPaneResult({
        bubbleId: targetBubbleId,
        repoPath,
        worktreePath: bubble.paths.worktreePath,
        active
      })
    );

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:16:02.000Z")
      },
      {
        setMetaReviewerPaneBinding: setPaneSpy
      }
    );

    expect(recovered.route).toBe("human_gate_approve");
    expect(setPaneSpy).toHaveBeenCalled();
    expect(
      setPaneSpy.mock.calls.some(([args]) => args.active === false)
    ).toBe(true);
  });

  it("rejects recovery when lifecycle is not META_REVIEW_RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_invalid_01",
      task: "Recover invalid lifecycle"
    });

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:17:00.000Z")
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });
  });

  it("appends human gate envelope to transcript and inbox on approve recovery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_transcript_01",
      task: "Recover transcript write"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:18:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:18:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:18:02.000Z")
    });
    expect(recovered.route).toBe("human_gate_approve");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(transcript.at(-1)?.type).toBe("APPROVAL_REQUEST");
    expect(inbox.at(-1)?.type).toBe("APPROVAL_REQUEST");
  });
});
