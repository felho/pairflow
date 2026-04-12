import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  BubbleListErrorV11 as BubbleListError,
  listBubblesV11 as listBubbles
} from "../../../src/v11/application/list/emitListV11.js";
import { appendProtocolEnvelope } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { upsertRuntimeSession } from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { metaReviewExecutionContextToRunningContext } from "../../../src/v11/shared/state/executionContext.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { writeWatchdogPaneActivity } from "../../../src/v11/infrastructure/artifact/watchdog/watchdogPaneActivityStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-bubble-list-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function createTempDir(prefix = "pairflow-bubble-list-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function normalizePath(path: string): Promise<string> {
  return realpath(path).catch(() => path);
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("listBubbles", () => {
  it("lists multi-bubble state summary and runtime session registry counts", async () => {
    const repoPath = await createTempRepo();

    const createdBubble = await createBubble({
      id: "b_list_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Created only",
      cwd: repoPath
    });
    const runningBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_02",
      task: "Running bubble"
    });

    await upsertRuntimeSession({
      sessionsPath: createdBubble.paths.sessionsPath,
      bubbleId: runningBubble.bubbleId,
      repoPath,
      worktreePath: runningBubble.paths.worktreePath,
      tmuxSessionName: "pf-b_list_02",
      now: new Date("2026-02-22T18:00:00.000Z")
    });
    await upsertRuntimeSession({
      sessionsPath: createdBubble.paths.sessionsPath,
      bubbleId: "b_stale_01",
      repoPath,
      worktreePath: "/tmp/nonexistent",
      tmuxSessionName: "pf-b_stale_01",
      now: new Date("2026-02-22T18:00:01.000Z")
    });

    const listed = await listBubbles({ repoPath });

    expect(listed.total).toBe(2);
    expect(listed.bubbles.map((item) => item.bubbleId)).toEqual([
      "b_list_01",
      "b_list_02"
    ]);
    expect(listed.byState.CREATED).toBe(1);
    expect(listed.byState.RUNNING).toBe(1);
    expect(listed.byState.READY_FOR_HUMAN_APPROVAL).toBe(0);
    expect(listed.runtimeSessions.registered).toBe(1);
    expect(listed.runtimeSessions.stale).toBe(1);
    expect(listed.bubbles[1]?.runtimeSession?.tmuxSessionName).toBe("pf-b_list_02");
  });

  it("resolves repository from cwd when repoPath is omitted", async () => {
    const repoPath = await createTempRepo();
    await createBubble({
      id: "b_list_03",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Cwd lookup",
      cwd: repoPath
    });
    const nested = join(repoPath, "nested", "path");
    await mkdir(nested, { recursive: true });

    const listed = await listBubbles({ cwd: nested });
    expect(listed.repoPath).toBe(await normalizePath(repoPath));
    expect(listed.total).toBe(1);
  });

  it("rejects when cwd is not inside a git repository", async () => {
    const dir = await createTempDir();
    const previousWorktreeRoot = process.env.PAIRFLOW_WORKTREE_ROOT;
    delete process.env.PAIRFLOW_WORKTREE_ROOT;
    try {
      await expect(listBubbles({ cwd: dir })).rejects.toBeInstanceOf(BubbleListError);
    } finally {
      if (previousWorktreeRoot === undefined) {
        delete process.env.PAIRFLOW_WORKTREE_ROOT;
      } else {
        process.env.PAIRFLOW_WORKTREE_ROOT = previousWorktreeRoot;
      }
    }
  });

  it("counts runtime session on non-runtime state bubble as stale", async () => {
    const repoPath = await createTempRepo();
    const createdBubble = await createBubble({
      id: "b_list_04",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Created with stale session",
      cwd: repoPath
    });

    await upsertRuntimeSession({
      sessionsPath: createdBubble.paths.sessionsPath,
      bubbleId: createdBubble.bubbleId,
      repoPath,
      worktreePath: createdBubble.paths.worktreePath,
      tmuxSessionName: "pf-b_list_04",
      now: new Date("2026-02-22T18:30:00.000Z")
    });

    const listed = await listBubbles({ repoPath });
    expect(listed.total).toBe(1);
    expect(listed.byState.CREATED).toBe(1);
    expect(listed.runtimeSessions.registered).toBe(0);
    expect(listed.runtimeSessions.stale).toBe(1);
    expect(listed.bubbles[0]?.runtimeSession?.tmuxSessionName).toBe("pf-b_list_04");
  });

  it("counts phase-2 states in byState summary", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_05",
      task: "Phase-2 state count"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const readyForApproval = applyStateTransition(loaded.state, {
      to: "READY_FOR_HUMAN_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-22T18:40:00.000Z"
    });
    const metaRunning = {
      ...readyForApproval,
      state: "RUNNING" as const,
      active_agent: "codex" as const,
      active_role: "meta_reviewer" as const,
      active_since: "2026-02-22T18:41:00.000Z",
      last_command_at: "2026-02-22T18:41:00.000Z",
      execution_context: metaReviewExecutionContextToRunningContext(
        buildMetaReviewExecutionContext({
          bubbleId: bubble.bubbleId,
          round: readyForApproval.round,
          startedAt: "2026-02-22T18:41:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      ),
      meta_review: {
        ...readyForApproval.meta_review!,
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: bubble.bubbleId,
          round: readyForApproval.round,
          startedAt: "2026-02-22T18:41:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      }
    };
    const humanGate = applyStateTransition(metaRunning, {
      to: "READY_FOR_HUMAN_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-22T18:42:00.000Z"
    });
    await writeStateSnapshot(bubble.paths.statePath, humanGate, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });

    const listed = await listBubbles({ repoPath });
    expect(listed.byState.READY_FOR_HUMAN_APPROVAL).toBe(1);
    expect(listed.byState.RUNNING).toBe(0);
  });

  it("surfaces runtime-missing attention in runtime-expected state", async () => {
    const repoPath = await createTempRepo();
    await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_attention_missing_01",
      task: "Runtime missing attention"
    });

    const listed = await listBubbles({
      repoPath,
      now: new Date("2026-02-22T18:45:00.000Z")
    });

    expect(listed.bubbles[0]?.attention).toMatchObject({
      code: "runtime_missing",
      severity: "critical",
      label: "No session"
    });
  });

  it("keeps list projection narrowed to live authority/runtime meta-review fields", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_list_meta_route_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "List meta-review route",
      cwd: repoPath
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T18:46:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 0,
        payload: {
          summary: "Meta-review route reached human gate.",
          metadata: {
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: "approve",
            meta_review_gate_route: "human_gate_approve"
          }
        },
        refs: []
      }
    });

    const listed = await listBubbles({ repoPath });

    expect(listed.bubbles[0]?.metaReview).toEqual({
      actor: "meta-reviewer",
      authorityActive: false,
      runtimeDelivery: null
    });
  });

  it("does not surface runtime-mismatch attention during PREPARING_WORKSPACE", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_list_preparing_runtime_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Preparing workspace transient runtime session",
      cwd: repoPath
    });

    const loaded = await readStateSnapshot(created.paths.statePath);
    const preparing = applyStateTransition(loaded.state, {
      to: "PREPARING_WORKSPACE",
      lastCommandAt: "2026-02-22T18:45:00.000Z"
    });
    await writeStateSnapshot(created.paths.statePath, preparing, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    });

    await upsertRuntimeSession({
      sessionsPath: created.paths.sessionsPath,
      bubbleId: created.bubbleId,
      repoPath,
      worktreePath: created.paths.worktreePath,
      tmuxSessionName: "pf-b_list_preparing_runtime_01",
      now: new Date("2026-02-22T18:45:01.000Z")
    });

    const listed = await listBubbles({
      repoPath,
      now: new Date("2026-02-22T18:45:02.000Z")
    });

    expect(listed.bubbles[0]?.state).toBe("PREPARING_WORKSPACE");
    expect(listed.bubbles[0]?.attention).toBeNull();
  });

  it("surfaces startup-incomplete attention with a distinct code for stale PREPARING_WORKSPACE", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_list_preparing_stale_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Preparing workspace stale startup attention",
      cwd: repoPath
    });

    const loaded = await readStateSnapshot(created.paths.statePath);
    const preparing = applyStateTransition(loaded.state, {
      to: "PREPARING_WORKSPACE",
      lastCommandAt: "2026-02-22T18:39:30.000Z"
    });
    await writeStateSnapshot(created.paths.statePath, preparing, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    });

    const listed = await listBubbles({
      repoPath,
      now: new Date("2026-02-22T18:45:00.000Z")
    });

    expect(listed.bubbles[0]?.state).toBe("PREPARING_WORKSPACE");
    expect(listed.bubbles[0]?.attention).toMatchObject({
      code: "startup_incomplete",
      severity: "warning",
      label: "Startup incomplete"
    });
  });

  it("surfaces quiet-pane attention after three quiet minutes", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_attention_quiet_01",
      task: "Quiet pane attention",
      startedAt: "2026-02-22T18:22:00.000Z"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_list_attention_quiet_01",
      now: new Date("2026-02-22T18:23:00.000Z")
    });
    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T18:22:50.000Z",
        pane_hash: "hash-quiet",
        last_changed_at: "2026-02-22T18:20:00.000Z",
        session_name: "pf-b_list_attention_quiet_01",
        target_pane: "pf-b_list_attention_quiet_01:0.1",
        last_sample_status: "sampled"
      }
    });

    const listed = await listBubbles({
      repoPath,
      now: new Date("2026-02-22T18:23:00.000Z")
    });

    expect(listed.bubbles[0]?.attention).toMatchObject({
      code: "quiet_pane",
      severity: "warning",
      label: "Quiet 3m"
    });
  });

  it("surfaces active meta-review runtime delivery diagnostics in list summaries", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_runtime_delivery_01",
      task: "Runtime delivery visible in list summary"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const metaRunning = {
      ...loaded.state,
      state: "RUNNING" as const,
      active_agent: "codex" as const,
      active_role: "meta_reviewer" as const,
      active_since: "2026-02-22T18:41:00.000Z",
      last_command_at: "2026-02-22T18:41:00.000Z",
      execution_context: metaReviewExecutionContextToRunningContext(
        buildMetaReviewExecutionContext({
          bubbleId: bubble.bubbleId,
          round: loaded.state.round,
          startedAt: "2026-02-22T18:41:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      ),
      meta_review: {
        ...loaded.state.meta_review!,
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: bubble.bubbleId,
          round: loaded.state.round,
          startedAt: "2026-02-22T18:41:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        }),
        runtime_delivery: {
          status: "failed" as const,
          reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed",
          observed_at: "2026-02-22T18:41:05.000Z",
          observed_for_handoff_id:
            `meta_review:${bubble.bubbleId}:round:${loaded.state.round}:attempt:1`,
          observed_for_round: loaded.state.round
        }
      }
    };
    await writeStateSnapshot(bubble.paths.statePath, metaRunning, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });

    const listed = await listBubbles({ repoPath });
    expect(listed.bubbles[0]?.metaReview.runtimeDelivery).toEqual({
      status: "failed",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
      message: "tmux send failed",
      observedAt: "2026-02-22T18:41:05.000Z",
      observedForHandoffId:
        `meta_review:${bubble.bubbleId}:round:${loaded.state.round}:attempt:1`,
      observedForRound: loaded.state.round
    });
  });

  it("keeps inspectable RUNNING meta-review authority bubbles visible and marks runtime session stale", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_legacy_meta_01",
      task: "Legacy inspectable meta-review state"
    });

    await writeFile(
      bubble.paths.statePath,
      `${JSON.stringify({
        bubble_id: bubble.bubbleId,
        state: "RUNNING",
        round: 1,
        active_agent: "codex",
        active_since: "2026-02-22T18:41:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: "2026-02-22T18:41:00.000Z",
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

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_list_legacy_meta_01",
      now: new Date("2026-02-22T18:45:00.000Z")
    });

    const listed = await listBubbles({ repoPath });

    expect(listed.byState.RUNNING).toBe(1);
    expect(listed.runtimeSessions.registered).toBe(0);
    expect(listed.runtimeSessions.stale).toBe(1);
    expect(listed.bubbles[0]?.stateValidation?.errors).toEqual([
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority"
      }
    ]);
  });
});
