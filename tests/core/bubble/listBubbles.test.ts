import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  BubbleListErrorV11 as BubbleListError,
  listBubblesV11 as listBubbles
} from "../../../src/v11/application/list/emitListV11.js";
import {
  writeRemotePointer,
  writeRemoteStateCache
} from "../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { RemoteBubbleStatusError } from "../../../src/v11/infrastructure/executor/ssh/sshBubbleStatus.js";
import { appendProtocolEnvelope } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { upsertRuntimeSession } from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { metaReviewExecutionContextToRunningContext } from "../../../src/v11/shared/state/executionContext.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { listCommandDefaults } from "../../../src/v11/shared/list/listCommandDefaults.js";
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

async function setBubbleInstanceStartedAt(
  bubbleTomlPath: string,
  startedAt: string
): Promise<void> {
  const current = parseBubbleConfigToml(await readFile(bubbleTomlPath, "utf8"));
  const timestamp = new Date(startedAt).getTime().toString(36).padStart(10, "0");
  await writeFile(
    bubbleTomlPath,
    renderBubbleConfigToml({
      ...current,
      bubble_instance_id: `bi_${timestamp}_fixture0001`
    }),
    "utf8"
  );
}

afterEach(async () => {
  vi.restoreAllMocks();
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
    expect(listed.bubbles[0]?.reviewPolicy).toEqual({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      reviewer_blocking_min_severity: "P3",
      meta_review_auto_rework_min_severity: "P3"
    });
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

  it("surfaces guarded meta-only review policy diagnostics in created list projections", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_list_policy_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "List review policy",
      cwd: repoPath
    });
    const current = parseBubbleConfigToml(await readFile(bubble.paths.bubbleTomlPath, "utf8"));
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...current,
        review_policy: {
          review_loop_mode: "meta_only",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2"
        }
      }),
      "utf8"
    );

    const listed = await listBubbles({ repoPath });

    expect(listed.bubbles[0]?.reviewPolicy).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
      blocked_prerequisites: ["reviewer_bypass_activation_provenance_required"],
      provenance_note:
        "Requested meta-only review remains fail-closed on the full review loop until canonical implementer pass authority proves reviewer-bypass activation for the live pass path."
    });
  });

  it("surfaces enabled meta-only review policy diagnostics in running list projections when runtime authority is proven", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_policy_running_01",
      task: "Running list review policy"
    });
    const current = parseBubbleConfigToml(await readFile(bubble.paths.bubbleTomlPath, "utf8"));
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...current,
        review_policy: {
          review_loop_mode: "meta_only",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2"
        }
      }),
      "utf8"
    );

    const listed = await listBubbles({ repoPath });

    expect(listed.bubbles[0]?.reviewPolicy).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "meta_only",
      support_status: "enabled",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2"
    });
  });

  it("skips a bubble that disappears after id enumeration", async () => {
    const repoPath = await createTempRepo();
    const keptBubble = await createBubble({
      id: "b_list_keep_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Kept bubble",
      cwd: repoPath
    });
    const deletedBubble = await createBubble({
      id: "b_list_deleted_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Deleted bubble",
      cwd: repoPath
    });

    await rm(deletedBubble.paths.bubbleDir, { recursive: true, force: true });
    vi.spyOn(listCommandDefaults, "listBubbleIds").mockResolvedValue([
      keptBubble.bubbleId,
      deletedBubble.bubbleId
    ]);

    const listed = await listBubbles({ repoPath });

    expect(listed.total).toBe(1);
    expect(listed.bubbles.map((entry) => entry.bubbleId)).toEqual([
      keptBubble.bubbleId
    ]);
    expect(listed.byState.CREATED).toBe(1);
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
    await setBubbleInstanceStartedAt(
      bubble.paths.bubbleTomlPath,
      "2026-02-22T18:22:00.000Z"
    );

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

  it("suppresses quiet-pane attention when the sampled record predates the current local bubble start", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_attention_prev_run_01",
      task: "Previous-run quiet pane suppression",
      startedAt: "2026-02-22T18:22:00.000Z"
    });
    await setBubbleInstanceStartedAt(
      bubble.paths.bubbleTomlPath,
      "2026-02-22T18:22:00.000Z"
    );

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_list_attention_prev_run_01",
      now: new Date("2026-02-22T18:23:00.000Z")
    });
    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T18:21:59.000Z",
        pane_hash: "hash-prev-run",
        last_changed_at: "2026-02-22T18:15:00.000Z",
        session_name: "pf-b_list_attention_prev_run_01",
        target_pane: "pf-b_list_attention_prev_run_01:0.1",
        last_sample_status: "sampled"
      }
    });

    const listed = await listBubbles({
      repoPath,
      now: new Date("2026-02-22T18:23:00.000Z")
    });

    expect(listed.bubbles[0]?.attention).toBeNull();
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

  it("drops stale meta-review runtime delivery diagnostics from list summaries", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_runtime_delivery_stale_01",
      task: "Runtime delivery stale in list summary"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-02-22T18:41:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeStateSnapshot(bubble.paths.statePath, {
      ...loaded.state,
      state: "RUNNING" as const,
      active_agent: "codex" as const,
      active_role: "meta_reviewer" as const,
      active_since: "2026-02-22T18:41:00.000Z",
      last_command_at: "2026-02-22T18:41:00.000Z",
      execution_context: metaReviewExecutionContextToRunningContext(
        executionContext
      ),
      meta_review: {
        ...loaded.state.meta_review!,
        execution_context: executionContext,
        runtime_delivery: {
          status: "failed" as const,
          reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed",
          observed_at: "2026-02-22T18:41:05.000Z",
          observed_for_handoff_id: `${executionContext.handoff_id}_stale`,
          observed_for_round: loaded.state.round
        }
      }
    }, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });

    const listed = await listBubbles({ repoPath });
    expect(listed.bubbles[0]?.metaReview.runtimeDelivery).toBeNull();
  });

  it("drops partially correlated meta-review runtime delivery diagnostics from list summaries", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_runtime_delivery_partial_01",
      task: "Runtime delivery partial in list summary"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-02-22T18:41:00.000Z",
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
        active_since: "2026-02-22T18:41:00.000Z",
        last_command_at: "2026-02-22T18:41:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          executionContext
        ),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
            message: "tmux send failed",
            observed_at: "2026-02-22T18:41:05.000Z",
            observed_for_handoff_id: null,
            observed_for_round: loaded.state.round
          }
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const listed = await listBubbles({ repoPath });
    expect(listed.bubbles[0]?.metaReview.runtimeDelivery).toBeNull();
  });

  it("drops reverse-direction partially correlated meta-review runtime delivery diagnostics from list summaries", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_runtime_delivery_partial_reverse_01",
      task: "Runtime delivery reverse partial in list summary"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-02-22T18:41:00.000Z",
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
        active_since: "2026-02-22T18:41:00.000Z",
        last_command_at: "2026-02-22T18:41:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          executionContext
        ),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
            message: "tmux send failed",
            observed_at: "2026-02-22T18:41:05.000Z",
            observed_for_handoff_id: executionContext.handoff_id,
            observed_for_round: null
          }
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const listed = await listBubbles({ repoPath });
    expect(listed.bubbles[0]?.metaReview.runtimeDelivery).toBeNull();
  });

  it("keeps inspectable RUNNING meta-review authority bubbles visible and marks runtime session stale", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_legacy_meta_01",
      task: "Legacy inspectable meta-review state"
    });
    const current = parseBubbleConfigToml(await readFile(bubble.paths.bubbleTomlPath, "utf8"));
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...current,
        review_policy: {
          review_loop_mode: "meta_only",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2"
        }
      }),
      "utf8"
    );

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
    expect(listed.bubbles[0]?.reviewPolicy).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
      blocked_prerequisites: ["reviewer_bypass_activation_provenance_required"],
      provenance_note:
        "Requested meta-only review remains fail-closed on the full review loop until canonical implementer pass authority proves reviewer-bypass activation for the live pass path."
    });
  });

  it("keeps started remote bubbles cache-first by default and avoids SSH refresh", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_cache_01",
      task: "Remote cache-first list"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_cache_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_cache_01",
      tmuxSession: "pf-b_list_remote_cache_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T10:00:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      maxRounds: 5
    });

    const remoteStatusSpy = vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    );

    const listed = await listBubbles({ repoPath });

    expect(remoteStatusSpy).not.toHaveBeenCalled();
    expect(listed.bubbles[0]?.state).toBe("WAITING_HUMAN");
    expect(listed.bubbles[0]?.lastCommandAt).toBeNull();
    expect(listed.bubbles[0]?.remoteExecution).toMatchObject({
      stateSource: "cache",
      cacheStatus: "present",
      lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
    });
    expect(listed.bubbles[0]?.remoteExecution?.runtimeAvailability).toBeUndefined();
    expect(listed.bubbles[0]?.remoteExecution?.runtimeReasonCode).toBeUndefined();
    expect(listed.bubbles[0]?.remoteExecution?.lastLiveCheckAt).toBeUndefined();
  });

  it("projects created remote bubbles in list output without SSH refresh", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_list_remote_created_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote created list projection",
      cwd: repoPath
    });
    const currentConfig = parseBubbleConfigToml(
      await readFile(bubble.paths.bubbleTomlPath, "utf8")
    );
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...currentConfig,
        review_policy: {
          review_loop_mode: "meta_only",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2"
        }
      }),
      "utf8"
    );

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "created",
      host: "ssh.example.com"
    });

    const remoteStatusSpy = vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    );

    const listed = await listBubbles({ repoPath });

    expect(remoteStatusSpy).not.toHaveBeenCalled();
    expect(listed.bubbles).toHaveLength(1);
    expect(listed.bubbles[0]).toMatchObject({
      bubbleId: bubble.bubbleId,
      state: "CREATED",
      round: 0,
      attention: null,
      reviewPolicy: {
        requested_loop_mode: "meta_only",
        effective_loop_mode: "full",
        support_status: "guarded",
        reviewer_blocking_min_severity: "P2",
        meta_review_auto_rework_min_severity: "P2",
        blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED"
      },
      remoteExecution: {
        host: "ssh.example.com",
        pointerKind: "created",
        stateSource: "created_not_started",
        cacheStatus: "missing"
      }
    });
    expect(listed.bubbles[0]?.remoteExecution?.runtimeAvailability).toBeUndefined();
    expect(listed.bubbles[0]?.remoteExecution?.runtimeReasonCode).toBeUndefined();
    expect(listed.bubbles[0]?.remoteExecution?.lastLiveCheckAt).toBeUndefined();
    expect(listed.remoteExecutionSummary).toEqual({
      createdNotStarted: 1,
      unavailableStarted: 0
    });
  });

  it("surfaces unavailable started remote bubbles when cache is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_missing_cache_01",
      task: "Remote missing cache"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_missing_cache_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_missing_cache_01",
      tmuxSession: "pf-b_list_remote_missing_cache_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });

    const listed = await listBubbles({ repoPath });

    expect(listed.bubbles[0]?.remoteExecution).toMatchObject({
      stateSource: "unavailable_started",
      cacheStatus: "missing",
      compatLifecyclePlaceholder: {
        source: "local_control_plane_compat"
      }
    });
    expect(listed.remoteExecutionSummary).toMatchObject({
      unavailableStarted: 1
    });
    expect(listed.byState.RUNNING).toBe(0);
  });

  it("keeps remote unavailable aggregates explicit in mixed list views", async () => {
    const repoPath = await createTempRepo();
    const localBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_local_mixed_01",
      task: "Local mixed list bubble"
    });
    const cachedRemoteBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_mixed_cache_01",
      task: "Remote mixed cache bubble"
    });
    const unavailableRemoteBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_mixed_unavailable_01",
      task: "Remote mixed unavailable bubble"
    });

    await writeRemotePointer(cachedRemoteBubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_mixed_cache_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_mixed_cache_01",
      tmuxSession: "pf-b_list_remote_mixed_cache_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await writeRemoteStateCache(cachedRemoteBubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T10:00:00.000Z",
      state: "WAITING_HUMAN",
      round: 3,
      maxRounds: 5
    });

    await writeRemotePointer(unavailableRemoteBubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_mixed_unavailable_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_mixed_unavailable_01",
      tmuxSession: "pf-b_list_remote_mixed_unavailable_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });

    const remoteStatusSpy = vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    );

    const listed = await listBubbles({ repoPath });
    const localEntry = listed.bubbles.find((entry) => entry.bubbleId === localBubble.bubbleId);
    const cachedRemoteEntry = listed.bubbles.find(
      (entry) => entry.bubbleId === cachedRemoteBubble.bubbleId
    );
    const unavailableRemoteEntry = listed.bubbles.find(
      (entry) => entry.bubbleId === unavailableRemoteBubble.bubbleId
    );

    expect(remoteStatusSpy).not.toHaveBeenCalled();
    expect(localEntry).toMatchObject({
      bubbleId: localBubble.bubbleId,
      state: "RUNNING"
    });
    expect(cachedRemoteEntry?.remoteExecution).toMatchObject({
      pointerKind: "started",
      stateSource: "cache",
      cacheStatus: "present",
      lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
    });
    expect(unavailableRemoteEntry?.remoteExecution).toMatchObject({
      pointerKind: "started",
      stateSource: "unavailable_started",
      cacheStatus: "missing",
      compatLifecyclePlaceholder: {
        state: "RUNNING",
        round: 1,
        source: "local_control_plane_compat"
      }
    });
    expect(listed.byState.RUNNING).toBe(1);
    expect(listed.byState.WAITING_HUMAN).toBe(1);
    expect(listed.remoteExecutionSummary).toEqual({
      createdNotStarted: 0,
      unavailableStarted: 1
    });
  });

  it("refreshes started remote bubbles explicitly and degrades partial failures to cache", async () => {
    const repoPath = await createTempRepo();
    const bubbleA = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_ok_01",
      task: "Remote refresh ok"
    });
    const bubbleB = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_fallback_01",
      task: "Remote refresh fallback"
    });

    await writeRemotePointer(bubbleA.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_ok_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_ok_01",
      tmuxSession: "pf-b_list_remote_refresh_ok_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await writeRemotePointer(bubbleB.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_fallback_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_fallback_01",
      tmuxSession: "pf-b_list_remote_refresh_fallback_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await writeRemoteStateCache(bubbleB.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:55:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });
    await setBubbleExecutorRemoteAlias(bubbleA.paths.bubbleTomlPath);
    await setBubbleExecutorRemoteAlias(bubbleB.paths.bubbleTomlPath);

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockImplementation(async ({ bubbleId }) => ({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow",
      ...(bubbleId === bubbleA.bubbleId ? { user: "pairflow" } : {})
    }));
    vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    ).mockImplementation(async ({ bubbleId }) => {
      if (bubbleId === bubbleB.bubbleId) {
        throw new RemoteBubbleStatusError({
          code: "REMOTE_STATUS_TRANSPORT_FAILED",
          message: "ssh timeout"
        });
      }
      return {
        bubbleStartedAt: "2026-04-16T09:40:00.000Z",
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 4,
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        lastCommandAt: "2026-04-16T10:00:00.000Z",
        paneActivity: {
          readStatus: "ok",
          lastChangedAt: "2026-04-16T09:59:00.000Z",
          sampledAt: "2026-04-16T10:00:00.000Z",
          sinceLastChangedSeconds: 60,
          sinceSampledSeconds: 0,
          lastSampleStatus: "sampled",
          lastSampleError: null,
          sessionName: "pf-b_list_remote_refresh_ok_01",
          targetPane: "pf-b_list_remote_refresh_ok_01:0.1"
        },
        executionContext: null,
        watchdog: {
          monitored: false,
          monitoredAgent: null,
          timeoutMinutes: 30,
          referenceTimestamp: "2026-04-16T10:00:00.000Z",
          deadlineTimestamp: null,
          remainingSeconds: null,
          expired: false
        },
        pendingInboxItems: {
          humanQuestions: 0,
          approvalRequests: 1,
          total: 1
        },
        transcript: {
          totalMessages: 5,
          lastMessageType: "APPROVAL_REQUEST",
          lastMessageTs: "2026-04-16T10:00:00.000Z",
          lastMessageId: "msg_list_remote_refresh_ok_01"
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
          round: 4
        },
        stateValidation: null,
        runtimeAvailability: "inactive",
        lastCheckedAt: "2026-04-16T10:01:00.000Z"
      };
    });

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });
    const refreshed = listed.bubbles.find((entry) => entry.bubbleId === bubbleA.bubbleId);
    const fallback = listed.bubbles.find((entry) => entry.bubbleId === bubbleB.bubbleId);

    expect(refreshed?.remoteExecution).toMatchObject({
      stateSource: "refresh",
      runtimeAvailability: "inactive",
      lastLiveCheckAt: "2026-04-16T10:01:00.000Z",
      lastCacheCheckAt: "2026-04-16T10:01:00.000Z"
    });
    expect(refreshed?.remoteExecution?.runtimeReasonCode).toBeUndefined();
    expect(refreshed?.lastCommandAt).toBe("2026-04-16T10:00:00.000Z");
    expect(fallback?.remoteExecution).toMatchObject({
      stateSource: "cache",
      cacheStatus: "present",
      lastCacheCheckAt: "2026-04-16T09:55:00.000Z",
      refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
      reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE"
    });
    expect(fallback?.remoteExecution?.runtimeAvailability).toBeUndefined();
    expect(fallback?.remoteExecution?.runtimeReasonCode).toBeUndefined();
    expect(fallback?.remoteExecution?.lastLiveCheckAt).toBeUndefined();
    expect(fallback?.lastCommandAt).toBeNull();
    expect(listed.remoteExecutionSummary).toMatchObject({
      refreshedThisRun: true
    });
  });

  it("surfaces runtime-loss distinctly for refreshed remote entries", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_runtime_missing_01",
      task: "Remote refresh runtime missing"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_runtime_missing_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_runtime_missing_01",
      tmuxSession: "pf-b_list_remote_refresh_runtime_missing_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    const current = parseBubbleConfigToml(await readFile(bubble.paths.bubbleTomlPath, "utf8"));
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...current,
        review_policy: {
          review_loop_mode: "meta_only",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2"
        }
      }),
      "utf8"
    );

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
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
        lastMessageId: "msg_list_remote_refresh_runtime_missing_01"
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

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]).toMatchObject({
      state: "RUNNING",
      round: 3,
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      reviewPolicy: {
        requested_loop_mode: "meta_only",
        effective_loop_mode: "full",
        support_status: "guarded",
        reviewer_blocking_min_severity: "P2",
        meta_review_auto_rework_min_severity: "P2",
        blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
        blocked_prerequisites: ["reviewer_bypass_activation_provenance_required"],
        provenance_note:
          "Requested meta-only review remains fail-closed on the full review loop until canonical implementer pass authority proves reviewer-bypass activation for the live pass path."
      },
      remoteExecution: {
        stateSource: "refresh",
        cacheStatus: "present",
        runtimeAvailability: "missing",
        runtimeReasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
        lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
        lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
      }
    });
    expect(listed.bubbles[0]?.remoteExecution?.reasonCode).toBeUndefined();
    expect(listed.byState.RUNNING).toBe(1);
    await expect(readFile(bubble.paths.remoteStateCachePath, "utf8")).resolves.toContain(
      "\"state\": \"RUNNING\""
    );
  });

  it("keeps refreshed remote entries active when only the watchdog expired", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_watchdog_live_01",
      task: "Remote refresh watchdog active"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_watchdog_live_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_watchdog_live_01",
      tmuxSession: "pf-b_list_remote_refresh_watchdog_live_01",
      startedAt: "2026-04-16T09:45:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
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
        sessionName: "pf-b_list_remote_refresh_watchdog_live_01",
        targetPane: "pf-b_list_remote_refresh_watchdog_live_01:0.1"
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
        lastMessageId: "msg_list_remote_refresh_watchdog_live_01"
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

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]).toMatchObject({
      attention: {
        code: "watchdog_expired",
        severity: "critical",
        label: "Watchdog expired"
      },
      remoteExecution: {
        stateSource: "refresh",
        cacheStatus: "present",
        runtimeAvailability: "active",
        lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
        lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
      }
    });
    expect(listed.bubbles[0]?.remoteExecution?.runtimeReasonCode).toBeUndefined();
  });

  it("keeps refreshed recovery entries active when watchdog agent identity is null", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_recovery_live_01",
      task: "Remote refresh recovery active"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_recovery_live_01",
      remoteClonePath:
        "/srv/pairflow/repo--b_list_remote_refresh_recovery_live_01",
      tmuxSession: "pf-b_list_remote_refresh_recovery_live_01",
      startedAt: "2026-04-16T09:45:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
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
        sessionName: "pf-b_list_remote_refresh_recovery_live_01",
        targetPane: "pf-b_list_remote_refresh_recovery_live_01:0.1"
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
        lastMessageId: "msg_list_remote_refresh_recovery_live_01"
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

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]).toMatchObject({
      state: "RUNNING",
      remoteExecution: {
        stateSource: "refresh",
        cacheStatus: "present",
        runtimeAvailability: "active",
        lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
        lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
      }
    });
    expect(listed.bubbles[0]?.remoteExecution?.runtimeReasonCode).toBeUndefined();
  });

  it("keeps refreshed live projection and omits stale cache timestamps when cache persistence fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_cache_write_fail_01",
      task: "Remote refresh cache write failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_cache_write_fail_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_cache_write_fail_01",
      tmuxSession: "pf-b_list_remote_refresh_cache_write_fail_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:55:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 4,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-04-16T10:00:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:59:00.000Z",
        sampledAt: "2026-04-16T10:00:00.000Z",
        sinceLastChangedSeconds: 60,
        sinceSampledSeconds: 0,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_list_remote_refresh_cache_write_fail_01",
        targetPane: "pf-b_list_remote_refresh_cache_write_fail_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: false,
        monitoredAgent: null,
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T10:00:00.000Z",
        deadlineTimestamp: null,
        remainingSeconds: null,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 1,
        total: 1
      },
      transcript: {
        totalMessages: 5,
        lastMessageType: "APPROVAL_REQUEST",
        lastMessageTs: "2026-04-16T10:00:00.000Z",
        lastMessageId: "msg_list_remote_refresh_cache_write_fail_01"
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
        round: 4
      },
      stateValidation: null,
      runtimeAvailability: "inactive",
      lastCheckedAt: "2026-04-16T10:01:00.000Z"
    });
    vi.spyOn(
      listCommandDefaults,
      "writeRemoteStateCache"
    ).mockRejectedValue(new Error("disk full"));

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]).toMatchObject({
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 4
    });
    expect(listed.bubbles[0]?.remoteExecution).toMatchObject({
      stateSource: "refresh",
      cacheStatus: "present",
      runtimeAvailability: "inactive",
      refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
      reasonCode: "LIST_REMOTE_CACHE_WRITE_FAILED",
      lastLiveCheckAt: "2026-04-16T10:01:00.000Z"
    });
    expect(listed.bubbles[0]?.remoteExecution?.lastCacheCheckAt).toBeUndefined();
    expect(listed.bubbles[0]?.remoteExecution?.runtimeReasonCode).toBeUndefined();
    expect(listed.remoteExecutionSummary).toMatchObject({
      refreshedThisRun: true
    });
  });

  it("preserves runtime-loss diagnostics when cache persistence fails after refresh", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_missing_cache_write_fail_01",
      task: "Remote refresh runtime missing cache write failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_missing_cache_write_fail_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_missing_cache_write_fail_01",
      tmuxSession: "pf-b_list_remote_refresh_missing_cache_write_fail_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:55:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
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
        lastMessageId: "msg_list_remote_refresh_missing_cache_write_fail_01"
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
      lastCheckedAt: "2026-04-16T10:01:00.000Z"
    });
    vi.spyOn(
      listCommandDefaults,
      "writeRemoteStateCache"
    ).mockRejectedValue(new Error("disk full"));

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]).toMatchObject({
      state: "RUNNING",
      round: 3,
      lastCommandAt: "2026-04-16T09:58:00.000Z",
      remoteExecution: {
        stateSource: "refresh",
        cacheStatus: "present",
        runtimeAvailability: "missing",
        runtimeReasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
        refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
        reasonCode: "LIST_REMOTE_CACHE_WRITE_FAILED",
        lastLiveCheckAt: "2026-04-16T10:01:00.000Z"
      }
    });
    expect(listed.bubbles[0]?.remoteExecution?.lastCacheCheckAt).toBeUndefined();
    expect(listed.byState.RUNNING).toBe(1);
    expect(listed.remoteExecutionSummary).toMatchObject({
      refreshedThisRun: true
    });
  });

  it("degrades refresh to cached projection when post-write cache fallback read fails unexpectedly", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_cache_read_fail_01",
      task: "Remote refresh cache read failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_cache_read_fail_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_cache_read_fail_01",
      tmuxSession: "pf-b_list_remote_refresh_cache_read_fail_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:55:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 4,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-04-16T10:00:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:59:00.000Z",
        sampledAt: "2026-04-16T10:00:00.000Z",
        sinceLastChangedSeconds: 60,
        sinceSampledSeconds: 0,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_list_remote_refresh_cache_read_fail_01",
        targetPane: "pf-b_list_remote_refresh_cache_read_fail_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: false,
        monitoredAgent: null,
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T10:00:00.000Z",
        deadlineTimestamp: null,
        remainingSeconds: null,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 1,
        total: 1
      },
      transcript: {
        totalMessages: 5,
        lastMessageType: "APPROVAL_REQUEST",
        lastMessageTs: "2026-04-16T10:00:00.000Z",
        lastMessageId: "msg_list_remote_refresh_cache_read_fail_01"
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
        round: 4
      },
      stateValidation: null,
      runtimeAvailability: "inactive",
      lastCheckedAt: "2026-04-16T10:01:00.000Z"
    });
    vi.spyOn(
      listCommandDefaults,
      "writeRemoteStateCache"
    ).mockRejectedValue(new Error("disk full"));

    const readRemoteStateCacheSpy = vi.spyOn(
      listCommandDefaults,
      "readRemoteStateCache"
    );
    let readCount = 0;
    readRemoteStateCacheSpy.mockImplementation(async (path) => {
      readCount += 1;
      if (readCount === 1) {
        return {
          lastCheckedAt: "2026-04-16T09:55:00.000Z",
          state: "WAITING_HUMAN",
          round: 2,
          maxRounds: 5
        };
      }
      throw new Error(`EIO reading ${path}`);
    });

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]?.remoteExecution).toMatchObject({
      stateSource: "cache",
      cacheStatus: "present",
      lastCacheCheckAt: "2026-04-16T09:55:00.000Z",
      refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
      reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE"
    });
    expect(listed.bubbles[0]?.state).toBe("WAITING_HUMAN");
    expect(listed.remoteExecutionSummary).toEqual({
      createdNotStarted: 0,
      unavailableStarted: 0
    });
  });

  it("preserves invalid-state attention for refreshed remote entries", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_invalid_01",
      task: "Remote refresh invalid state"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_invalid_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_invalid_01",
      tmuxSession: "pf-b_list_remote_refresh_invalid_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "RUNNING",
      round: 4,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-04-16T09:41:00.000Z",
      lastCommandAt: "2026-04-16T10:00:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:59:00.000Z",
        sampledAt: "2026-04-16T10:00:00.000Z",
        sinceLastChangedSeconds: 60,
        sinceSampledSeconds: 0,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_list_remote_refresh_invalid_01",
        targetPane: "pf-b_list_remote_refresh_invalid_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "codex",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T10:00:00.000Z",
        deadlineTimestamp: "2026-04-16T10:30:00.000Z",
        remainingSeconds: 1800,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 5,
        lastMessageType: "PASS",
        lastMessageTs: "2026-04-16T10:00:00.000Z",
        lastMessageId: "msg_list_remote_refresh_invalid_01"
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
        round: 4
      },
      stateValidation: {
        message: "invalid",
        errors: [
          {
            path: "state.round",
            message: "Expected integer"
          }
        ]
      },
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:01:00.000Z"
    });

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]).toMatchObject({
      stateValidation: {
        message: "invalid"
      },
      attention: {
        code: "state_invalid",
        severity: "critical",
        label: "Invalid state"
      },
      remoteExecution: {
        stateSource: "refresh",
        cacheStatus: "present",
        lastCacheCheckAt: "2026-04-16T10:01:00.000Z"
      }
    });
  });

  it("surfaces non-validation attention for refreshed remote entries with active runtime diagnostics", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_quiet_01",
      task: "Remote refresh quiet pane attention"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_quiet_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_quiet_01",
      tmuxSession: "pf-b_list_remote_refresh_quiet_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "RUNNING",
      round: 4,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-04-16T09:41:00.000Z",
      lastCommandAt: "2026-04-16T10:00:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:55:00.000Z",
        sampledAt: "2026-04-16T10:00:00.000Z",
        sinceLastChangedSeconds: 300,
        sinceSampledSeconds: 0,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_list_remote_refresh_quiet_01",
        targetPane: "pf-b_list_remote_refresh_quiet_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "codex",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T10:00:00.000Z",
        deadlineTimestamp: "2026-04-16T10:30:00.000Z",
        remainingSeconds: 1800,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 5,
        lastMessageType: "PASS",
        lastMessageTs: "2026-04-16T10:00:00.000Z",
        lastMessageId: "msg_list_remote_refresh_quiet_01"
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
        round: 4
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:01:00.000Z"
    });

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]).toMatchObject({
      attention: {
        code: "quiet_pane",
        severity: "warning",
        label: "Quiet 7m"
      },
      runtimeSession: null,
      remoteExecution: {
        stateSource: "refresh",
        cacheStatus: "present",
        runtimeAvailability: "active",
        lastLiveCheckAt: "2026-04-16T10:01:00.000Z",
        lastCacheCheckAt: "2026-04-16T10:01:00.000Z"
      }
    });
    expect(listed.bubbles[0]?.remoteExecution?.runtimeReasonCode).toBeUndefined();
  });

  it("suppresses refreshed remote quiet-pane attention when the latest sample predates bubbleStartedAt", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_prev_run_01",
      task: "Remote refresh previous-run quiet pane suppression"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_prev_run_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_prev_run_01",
      tmuxSession: "pf-b_list_remote_refresh_prev_run_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    ).mockResolvedValue({
      bubbleStartedAt: "2026-04-16T09:40:00.000Z",
      state: "RUNNING",
      round: 4,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-04-16T09:41:00.000Z",
      lastCommandAt: "2026-04-16T10:00:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-04-16T09:20:00.000Z",
        sampledAt: "2026-04-16T09:39:59.000Z",
        sinceLastChangedSeconds: 2520,
        sinceSampledSeconds: 1261,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_list_remote_refresh_prev_run_01",
        targetPane: "pf-b_list_remote_refresh_prev_run_01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "codex",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-04-16T10:00:00.000Z",
        deadlineTimestamp: "2026-04-16T10:30:00.000Z",
        remainingSeconds: 1800,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 5,
        lastMessageType: "PASS",
        lastMessageTs: "2026-04-16T10:00:00.000Z",
        lastMessageId: "msg_list_remote_refresh_prev_run_01"
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
        round: 4
      },
      stateValidation: null,
      runtimeAvailability: "active",
      lastCheckedAt: "2026-04-16T10:01:00.000Z"
    });

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:01:00.000Z")
    });

    expect(listed.bubbles[0]?.attention).toBeNull();
  });

  it("degrades list refresh to cache when the bubble lacks an ssh executor alias", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_missing_alias_01",
      task: "Remote refresh missing alias"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_missing_alias_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_missing_alias_01",
      tmuxSession: "pf-b_list_remote_refresh_missing_alias_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:55:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });

    const resolveTargetSpy = vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    );

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:01:00.000Z")
    });

    expect(resolveTargetSpy).not.toHaveBeenCalled();
    expect(listed.bubbles[0]?.lastCommandAt).toBeNull();
    expect(listed.bubbles[0]?.remoteExecution).toMatchObject({
      stateSource: "cache",
      cacheStatus: "present",
      lastCacheCheckAt: "2026-04-16T09:55:00.000Z",
      refreshAttemptedAt: "2026-04-16T10:01:00.000Z",
      reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE"
    });
  });

  it("does not hide unexpected refresh implementation failures behind cache fallback", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_refresh_bug_01",
      task: "Remote refresh unexpected failure"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_refresh_bug_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_refresh_bug_01",
      tmuxSession: "pf-b_list_remote_refresh_bug_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);
    await writeRemoteStateCache(bubble.paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-16T09:55:00.000Z",
      state: "WAITING_HUMAN",
      round: 2,
      maxRounds: 5
    });

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockImplementation(async () => {
      throw new TypeError("unexpected resolver bug");
    });

    await expect(
      listBubbles({
        repoPath,
        refresh: true,
        now: new Date("2026-04-16T10:01:00.000Z")
      })
    ).rejects.toThrow("unexpected resolver bug");
  });

  it("omits refresh summary when the repository has no remote bubbles", async () => {
    const repoPath = await createTempRepo();
    await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_local_refresh_01",
      task: "Local only refresh list"
    });

    const listed = await listBubbles({ repoPath, refresh: true });

    expect(listed.remoteExecutionSummary).toBeUndefined();
  });

  it("keeps started remote bubbles unavailable after refresh failure without cache", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_remote_double_miss_01",
      task: "Remote double-miss"
    });

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_list_remote_double_miss_01",
      remoteClonePath: "/srv/pairflow/repo--b_list_remote_double_miss_01",
      tmuxSession: "pf-b_list_remote_double_miss_01",
      startedAt: "2026-04-16T09:40:00.000Z"
    });
    await setBubbleExecutorRemoteAlias(bubble.paths.bubbleTomlPath);

    vi.spyOn(
      listCommandDefaults,
      "resolveRemoteBubbleStatusTarget"
    ).mockResolvedValue({
      alias: "lab",
      host: "ssh.example.com",
      pairflowCommand: "pairflow"
    });
    vi.spyOn(
      listCommandDefaults,
      "executeRemoteBubbleStatus"
    ).mockRejectedValue(
      new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_TRANSPORT_FAILED",
        message: "ssh timeout"
      })
    );

    const listed = await listBubbles({
      repoPath,
      refresh: true,
      now: new Date("2026-04-16T10:02:00.000Z")
    });

    expect(listed.bubbles[0]?.remoteExecution).toMatchObject({
      stateSource: "unavailable_started",
      cacheStatus: "missing",
      refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
      reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE",
      compatLifecyclePlaceholder: {
        state: "RUNNING",
        round: 1,
        source: "local_control_plane_compat"
      }
    });
    expect(listed.bubbles[0]?.remoteExecution?.runtimeAvailability).toBeUndefined();
    expect(listed.bubbles[0]?.remoteExecution?.runtimeReasonCode).toBeUndefined();
    expect(listed.byState.RUNNING).toBe(0);
    expect(listed.remoteExecutionSummary).toEqual({
      createdNotStarted: 0,
      unavailableStarted: 1
    });
  });
});
