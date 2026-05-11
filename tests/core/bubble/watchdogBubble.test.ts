import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import {
  emitAskHumanFromWorkspace
} from "../../../src/v11/application/askHuman/askHumanCommandApi.js";
import { emitRequestRework } from "../../../src/v11/application/approval/approvalCommandApi.js";
import {
  DEFAULT_RESUME_MESSAGE,
  resumeBubbleCommandOrchestration as resumeBubble
} from "../../../src/v11/application/resume/resumeCommandOrchestration.js";
import { emitHumanReply } from "../../../src/v11/application/reply/replyCommandApi.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { watchdogCommandDefaults } from "../../../src/v11/defaults/watchdog/watchdogCommandDefaults.js";
import { watchdogPendingReworkDefaults } from "../../../src/v11/defaults/watchdog/watchdogPendingReworkDefaults.js";
import {
  readRuntimeSessionsRegistry,
  upsertRuntimeSession
} from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { setMetaReviewerPaneBinding } from "../../../src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.js";
import { runTmux } from "../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { metaReviewExecutionContextToRunningContext } from "../../../src/v11/domain/state/execution/executionContext.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { runBubbleWatchdog as runBubbleWatchdogImpl } from "../../../src/v11/application/watchdog/watchdogCommandApi.js";
import type { BubbleWatchdogDependencies } from "../../../src/v11/application/watchdog/watchdogCommandContract.js";
import type { EmitDeliveryNotificationAckPort } from "../../../src/v11/ports/tmuxDelivery.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function runBubbleWatchdog(
  input: Parameters<typeof runBubbleWatchdogImpl>[0],
  dependencies: Partial<BubbleWatchdogDependencies> = {}
): Promise<Awaited<ReturnType<typeof runBubbleWatchdogImpl>>> {
  return runBubbleWatchdogImpl(input, {
    ...watchdogCommandDefaults,
    ...watchdogPendingReworkDefaults,
    readRuntimeSessionsRegistry,
    runTmux,
    ...dependencies
  });
}

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-watchdog-bubble-"));
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

async function installFakeTmuxForDeliveryConfirmation(stateFilePath: string): Promise<string> {
  const binDir = await mkdtemp(join(tmpdir(), "pairflow-watchdog-fake-tmux-"));
  tempDirs.push(binDir);
  const scriptPath = join(binDir, "tmux");
  const script = [
    "#!/bin/sh",
    "STATE_FILE=\"$PAIRFLOW_FAKE_TMUX_STATE\"",
    "cmd=\"$1\"",
    "shift",
    "if [ \"$cmd\" = \"send-keys\" ]; then",
    "  while [ \"$#\" -gt 0 ]; do",
    "    if [ \"$1\" = \"-l\" ]; then",
    "      shift",
    "      if [ -n \"$STATE_FILE\" ]; then",
    "        printf '%s\\n' \"$1\" > \"$STATE_FILE\"",
    "      fi",
    "      exit 0",
    "    fi",
    "    shift",
    "  done",
    "  exit 0",
    "fi",
    "if [ \"$cmd\" = \"capture-pane\" ]; then",
    "  if [ -n \"$STATE_FILE\" ] && [ -f \"$STATE_FILE\" ]; then",
    "    cat \"$STATE_FILE\"",
    "    printf '\\n>\\n'",
    "  fi",
    "  exit 0",
    "fi",
    "exit 0"
  ].join("\n");
  await writeFile(scriptPath, `${script}\n`, "utf8");
  await chmod(scriptPath, 0o755);

  process.env.PAIRFLOW_FAKE_TMUX_STATE = stateFilePath;
  process.env.PATH = `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`;
  return binDir;
}

describe("runBubbleWatchdog", () => {
  async function moveToMetaReviewRunning(input: {
    statePath: string;
    activeSinceIso: string;
    lastCommandAtIso: string;
    activeAgent?: "codex" | null;
  }): Promise<void> {
    const loaded = await readStateSnapshot(input.statePath);
    const readyForApproval = applyStateTransition(loaded.state, {
      to: "READY_FOR_HUMAN_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.lastCommandAtIso
    });
    const metaReviewRunning = {
      ...readyForApproval,
      state: "RUNNING" as const,
      active_agent: input.activeAgent === undefined ? "codex" : input.activeAgent,
      active_role:
        input.activeAgent === null ? null : ("meta_reviewer" as const),
      active_since: input.activeAgent === null ? null : input.activeSinceIso,
      last_command_at: input.lastCommandAtIso,
      execution_context: metaReviewExecutionContextToRunningContext(
        buildMetaReviewExecutionContext({
          bubbleId: loaded.state.bubble_id,
          round: readyForApproval.round,
          startedAt: input.activeSinceIso,
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      ),
      meta_review: {
        ...readyForApproval.meta_review!,
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: loaded.state.bubble_id,
          round: readyForApproval.round,
          startedAt: input.activeSinceIso,
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      }
    };
    await writeStateSnapshot(input.statePath, metaReviewRunning, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });
  }

  function buildRuntimeDelivery(input: {
    executionContext: ReturnType<typeof buildMetaReviewExecutionContext>;
    status: "confirmed" | "uncertain" | "failed";
    reasonCode: string | null;
    message: string;
    observedAt: string;
  }) {
    return {
      status: input.status,
      reason_code: input.reasonCode,
      message: input.message,
      observed_at: input.observedAt,
      observed_for_handoff_id: input.executionContext.handoff_id,
      observed_for_round: input.executionContext.round
    };
  }

  it("applies pending deferred rework intent in WAITING_HUMAN after confirmed delivery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_rework_01",
      task: "Apply deferred rework intent"
    });

    await emitAskHumanFromWorkspace({
      question: "Need operator confirmation.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T12:01:00.000Z")
    });

    const queued = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Queue deterministic rework intent.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:02:00.000Z")
    });
    expect(queued.mode).toBe("queued");
    if (queued.mode !== "queued") {
      throw new Error("Expected queued deferred rework result.");
    }

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      workspacePath: bubble.paths.worktreePath,
      workspaceKind: "worktree",
      tmuxSessionName: "pf-watchdog-rework",
      now: new Date("2026-02-22T12:02:30.000Z")
    });

    const originalPath = process.env.PATH;
    const originalFakeState = process.env.PAIRFLOW_FAKE_TMUX_STATE;
    const fakeStatePath = join(repoPath, ".pairflow", "fake-tmux-state.txt");
    await installFakeTmuxForDeliveryConfirmation(fakeStatePath);

    try {
      const result = await runBubbleWatchdog({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:03:00.000Z")
      });

      expect(result.escalated).toBe(false);
      expect(result.reason).toBe("rework_intent_applied");
      expect(result.intentId).toBe(queued.intentId);
      expect(result.state.state).toBe("RUNNING");
      expect(result.state.round).toBe(2);
      expect(result.state.active_agent).toBe(bubble.config.agents.implementer);
      expect(result.state.pending_rework_intent).toBeNull();
      expect(result.state.rework_intent_history).toContainEqual(
        expect.objectContaining({
          intent_id: queued.intentId,
          status: "applied"
        })
      );
    } finally {
      process.env.PATH = originalPath;
      if (originalFakeState === undefined) {
        delete process.env.PAIRFLOW_FAKE_TMUX_STATE;
      } else {
        process.env.PAIRFLOW_FAKE_TMUX_STATE = originalFakeState;
      }
    }
  });

  it("retains pending deferred rework intent when delivery is not confirmed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_rework_02",
      task: "Retain deferred rework intent on delivery failure"
    });

    await emitAskHumanFromWorkspace({
      question: "Need a decision before continuing.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T12:11:00.000Z")
    });

    const queued = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Queue and wait for delivery confirmation.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:12:00.000Z")
    });
    expect(queued.mode).toBe("queued");
    if (queued.mode !== "queued") {
      throw new Error("Expected queued deferred rework result.");
    }

    const result = await runBubbleWatchdog(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:13:00.000Z")
      },
      {
        emitDeliveryNotificationAck: () =>
          Promise.resolve({
            status: "rejected",
            message: "",
            reason: "delivery_unconfirmed",
            reason_code: "DELIVERY_ACK_REJECTED"
          })
      }
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("rework_delivery_failed");
    expect(result.intentId).toBe(queued.intentId);
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.deliveryError).toContain("rerun watchdog");
    expect(result.deliveryError).toContain("reason_code: DELIVERY_ACK_REJECTED");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.pending_rework_intent).toMatchObject({
      intent_id: queued.intentId,
      status: "pending"
    });
  });

  it("preserves rework-intent ref through resolver->delivery handoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_rework_03",
      task: "Resolver-based rework intent delivery ref"
    });

    await emitAskHumanFromWorkspace({
      question: "Need operator confirmation.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T12:21:00.000Z")
    });

    const queued = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Queue resolver-backed rework intent delivery.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:22:00.000Z")
    });
    expect(queued.mode).toBe("queued");
    if (queued.mode !== "queued") {
      throw new Error("Expected queued deferred rework result.");
    }

    const capturedRefPairs: Array<{ messageRef: string; envelopeRef: string }> = [];
    const result = await runBubbleWatchdog(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:23:00.000Z")
      },
      {
        emitDeliveryNotificationAck: (
          input: Parameters<EmitDeliveryNotificationAckPort>[0]
        ) => {
          if (input.messageRef === undefined) {
            throw new Error("Expected messageRef for deferred rework-intent delivery.");
          }
          const envelopeRef = input.envelope.refs[0];
          if (envelopeRef === undefined) {
            throw new Error("Expected envelope refs[0] for deferred rework-intent delivery.");
          }
          capturedRefPairs.push({
            messageRef: input.messageRef,
            envelopeRef
          });
          return Promise.resolve({
            status: "accepted",
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          });
        }
      }
    );

    expect(result.reason).toBe("rework_intent_applied");
    expect(capturedRefPairs).toEqual([
      {
        messageRef: `rework-intent://${queued.intentId}`,
        envelopeRef: `rework-intent://${queued.intentId}`
      }
    ]);
  });

  it("escalates expired RUNNING watchdog to HUMAN_QUESTION + WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_01",
      task: "Watchdog escalation task",
      startedAt
    });
    const escalatedAt = new Date(
      Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
    );
    const deliveryRefs: string[] = [];

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: escalatedAt
    }, {
      emitDeliveryNotificationAck: (
        input: Parameters<EmitDeliveryNotificationAckPort>[0]
      ) => {
        if (input.messageRef !== undefined) {
          deliveryRefs.push(input.messageRef);
        }
        return Promise.resolve({
          status: "accepted",
          message: "ok",
          sessionName: "pf_bubble",
          targetPaneIndex: 1
        });
      },
      emitBubbleNotification: () =>
        Promise.resolve({
          kind: "waiting-human",
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        })
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.envelope?.type).toBe("HUMAN_QUESTION");
    expect(result.envelope?.sender).toBe("orchestrator");
    expect(result.envelope?.recipient).toBe("human");
    expect(result.state.state).toBe("WAITING_HUMAN");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("HUMAN_QUESTION");

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.at(-1)?.type).toBe("HUMAN_QUESTION");

    expect(deliveryRefs).toEqual([
      `${bubble.paths.transcriptPath}#${result.envelope?.id}`
    ]);
    expect(deliveryRefs[0]?.startsWith("transcript.ndjson#")).toBe(false);
  });

  it("returns no-op when watchdog has not expired", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_02",
      task: "Watchdog no-op task",
      startedAt: "2026-02-22T12:00:00.000Z"
    });

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:03:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
  });

  it("returns no-op when bubble is RUNNING ideation round (round=0)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_round0_01",
      task: "Watchdog ideation round zero no-op",
      startedAt: "2026-02-22T12:00:00.000Z"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        execution_context: null,
        round: 0
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_monitored");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.round).toBe(0);
  });

  it("returns no-op when bubble is not in RUNNING state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_watchdog_03",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Watchdog non-running task",
      cwd: repoPath
    });

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:20:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_monitored");
    expect(result.state.state).toBe("CREATED");
  });

  it("routes RUNNING meta-review authority timeout to WAITING_HUMAN with HUMAN_QUESTION", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_timeout_01",
      task: "Meta-review watchdog timeout route",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.envelope?.type).toBe("HUMAN_QUESTION");
    const question = result.envelope?.payload.question;
    expect(typeof question).toBe("string");
    expect(question).toContain("restart or re-run meta-review");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("HUMAN_QUESTION");
    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.at(-1)?.type).toBe("HUMAN_QUESTION");
  });

  it("allows resume after meta-review watchdog timeout", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_timeout_resume_01",
      task: "Meta-review watchdog timeout should remain resumable",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const watchdogResult = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(watchdogResult.escalated).toBe(true);
    expect(watchdogResult.state.state).toBe("WAITING_HUMAN");

    const resumedAt = new Date("2026-02-22T14:01:00.000Z");
    const resumeResult = await resumeBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: resumedAt
    });

    expect(resumeResult.envelope.type).toBe("HUMAN_REPLY");
    expect(resumeResult.envelope.payload.message).toBe(DEFAULT_RESUME_MESSAGE);
    expect(resumeResult.state.state).toBe("RUNNING");
    expect(resumeResult.state.active_agent).toBe("codex");
    expect(resumeResult.state.active_role).toBe("meta_reviewer");
    expect(resumeResult.state.active_since).toBe(resumedAt.toISOString());
    expect(resumeResult.state.execution_context).toMatchObject({
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      round: 1,
      started_at: resumedAt.toISOString()
    });

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("HUMAN_REPLY");
  });

  it("allows explicit reply after meta-review watchdog timeout", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_timeout_reply_01",
      task: "Meta-review watchdog timeout should accept explicit human reply",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const watchdogResult = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(watchdogResult.escalated).toBe(true);
    expect(watchdogResult.state.state).toBe("WAITING_HUMAN");

    const replyAt = new Date("2026-02-22T14:01:00.000Z");
    const replyResult = await emitHumanReply({
      bubbleId: bubble.bubbleId,
      message: "Meta-review timeout acknowledged; continue the meta-review flow.",
      cwd: repoPath,
      now: replyAt
    });

    expect(replyResult.envelope.type).toBe("HUMAN_REPLY");
    expect(replyResult.envelope.payload.message).toBe(
      "Meta-review timeout acknowledged; continue the meta-review flow."
    );
    expect(replyResult.state.state).toBe("RUNNING");
    expect(replyResult.state.active_agent).toBe("codex");
    expect(replyResult.state.active_role).toBe("meta_reviewer");
    expect(replyResult.state.active_since).toBe(replyAt.toISOString());
    expect(replyResult.state.execution_context).toMatchObject({
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      round: 1,
      started_at: replyAt.toISOString()
    });

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("HUMAN_REPLY");
  });

  it("keeps RUNNING meta-review authority before deadline even when runtime delivery failed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_timeout_before_deadline_01",
      task: "Meta-review watchdog ignores runtime delivery before deadline",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const running = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = running.state.meta_review?.execution_context;
    if (executionContext === null || executionContext === undefined) {
      throw new Error("Expected active meta-review execution context.");
    }
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        active_agent: null,
        active_role: null,
        active_since: null,
        meta_review: {
          ...running.state.meta_review!,
          runtime_delivery: buildRuntimeDelivery({
            executionContext,
            status: "failed",
            reasonCode: "META_REVIEWER_PANE_EXITED",
            message: "meta-reviewer pane exited after durable kickoff",
            observedAt: "2026-02-22T12:04:30.000Z"
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await runBubbleWatchdog(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:04:45.000Z")
      }
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEWER_PANE_EXITED"
    });
  });

  it("still monitors RUNNING meta-review authority when active_agent is null in recovery state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_timeout_02",
      task: "Meta-review watchdog timeout route with null active agent",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });
    const running = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        active_agent: null,
        active_role: null,
        active_since: null,
        meta_review: {
          ...(running.state.meta_review ?? {
            auto_rework_count: 0,
            auto_rework_limit: 5,
            sticky_human_gate: false,
            consecutive_clean_runs: 0,
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );
    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.envelope?.type).toBe("HUMAN_QUESTION");
  });

  it("routes timeout from the original execution-context deadline after restart/rebind activity", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_timeout_rebind_01",
      task: "Meta-review watchdog restart/rebind deadline authority",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const running = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = running.state.meta_review?.execution_context;
    if (executionContext === null || executionContext === undefined) {
      throw new Error("Expected active meta-review execution context.");
    }
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-02-22T12:59:00.000Z",
        last_command_at: "2026-02-22T12:59:30.000Z",
        meta_review: {
          ...running.state.meta_review!,
          runtime_delivery: buildRuntimeDelivery({
            executionContext,
            status: "uncertain",
            reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
            message: "meta-reviewer pane did not confirm structured submit request delivery",
            observedAt: "2026-02-22T12:59:30.000Z"
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T13:01:00.000Z")
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.envelope?.type).toBe("HUMAN_QUESTION");
  });

  it("does not rely on pane-binding mutation when watchdog routes meta-review timeout", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_timeout_03",
      task: "Meta-review timeout pane deactivation",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-watchdog-meta-timeout",
      now: new Date("2026-02-22T12:00:00.000Z")
    });
    await setMetaReviewerPaneBinding({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      active: true,
      now: new Date("2026-02-22T12:00:01.000Z")
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(result.escalated).toBe(true);
    const sessions = await readRuntimeSessionsRegistry(bubble.paths.sessionsPath, {
      allowMissing: false
    });
    expect(sessions[bubble.bubbleId]?.metaReviewerPane?.active).toBe(true);
  });

  it("does not route canonical RUNNING meta-review submit snapshot before timeout expiry", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_submit_01",
      task: "Meta-review watchdog canonical submit route",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const running = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        meta_review: {
          ...(running.state.meta_review ?? {
            auto_rework_count: 0,
            auto_rework_limit: 5,
            sticky_human_gate: false,
            consecutive_clean_runs: 0,
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );
    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:02:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");
    expect(result.envelope).toBeUndefined();
  });

  it("does not route canonical rework submit snapshot before timeout", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_submit_rework_01",
      task: "Meta-review watchdog canonical rework route",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const running = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        meta_review: {
          ...(running.state.meta_review ?? {
            auto_rework_count: 0,
            auto_rework_limit: 5,
            sticky_human_gate: false,
            consecutive_clean_runs: 0,
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );
    const findingsRaw = `${JSON.stringify(
      {
        open_total: 1,
        findings: [
          {
            id: "f_1",
            status: "open"
          }
        ]
      },
      null,
      2
    )}\n`;
    await writeFile(
      join(bubble.paths.artifactsDir, "rework-findings.json"),
      findingsRaw,
      "utf8"
    );

    const deliveries: Array<{
      bubbleId: string;
      envelopeType: string;
      recipient: string;
      decision: string | undefined;
      messageRef: string | undefined;
    }> = [];

    const result = await runBubbleWatchdog(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:02:00.000Z")
      },
      {
        emitDeliveryNotificationAck: async (
          input: Parameters<EmitDeliveryNotificationAckPort>[0]
        ) => {
          deliveries.push({
            bubbleId: input.bubbleId,
            envelopeType: input.envelope.type,
            recipient: input.envelope.recipient,
            decision:
              input.envelope.type === "APPROVAL_DECISION"
                ? input.envelope.payload.decision
                : undefined,
            messageRef: input.messageRef
          });
          return {
            status: "accepted",
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          };
        }
      }
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");
    expect(result.envelope).toBeUndefined();
    expect(deliveries).toHaveLength(0);
  });

  it("does not route canonical submit snapshot when submit is outside active window", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_submit_02",
      task: "Meta-review watchdog only routes canonical submit inside active window",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const running = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        meta_review: {
          ...(running.state.meta_review ?? {
            auto_rework_count: 0,
            auto_rework_limit: 5,
            sticky_human_gate: false,
            consecutive_clean_runs: 0,
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:02:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");
  });

  it("routes timeout to READY_FOR_HUMAN_APPROVAL when only stale snapshot exists outside active window", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_submit_03",
      task: "Meta-review timeout must ignore stale canonical snapshot from previous round",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const running = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        meta_review: {
          ...(running.state.meta_review ?? {
            auto_rework_count: 0,
            auto_rework_limit: 5,
            sticky_human_gate: false,
            consecutive_clean_runs: 0,
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.envelope?.type).toBe("HUMAN_QUESTION");
    expect(result.envelope?.payload.question).toContain("restart or re-run meta-review");
  });

  it("does not fail watchdog cycle when meta-review routing sees state conflict before timeout", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_conflict_01",
      task: "Watchdog meta-review route conflict (pre-timeout)",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });
    const running = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...running.state,
        meta_review: {
          ...(running.state.meta_review ?? {
            auto_rework_count: 0,
            auto_rework_limit: 5,
            sticky_human_gate: false,
            consecutive_clean_runs: 0,
          }),
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:02:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");
  });

  it("does not fail watchdog cycle when timeout routing sees state conflict and lifecycle already progressed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_conflict_02",
      task: "Watchdog meta-review route conflict (timeout)",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const progressed = applyStateTransition(loaded.state, {
      to: "READY_FOR_HUMAN_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-22T14:00:00.000Z"
    });
    expect(progressed.state).toBe("READY_FOR_HUMAN_APPROVAL");
    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
  });
});
