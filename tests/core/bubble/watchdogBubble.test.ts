import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { runBubbleWatchdog } from "../../../src/core/bubble/watchdogBubble.js";
import { MetaReviewGateError } from "../../../src/core/bubble/metaReviewGate.js";
import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitRequestRework } from "../../../src/core/human/approval.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import {
  readRuntimeSessionsRegistry,
  setMetaReviewerPaneBinding,
  upsertRuntimeSession
} from "../../../src/core/runtime/sessionsRegistry.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

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
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.lastCommandAtIso
    });
    const metaReviewRunning = applyStateTransition(readyForApproval, {
      to: "META_REVIEW_RUNNING",
      activeAgent: input.activeAgent ?? "codex",
      activeRole: input.activeAgent === null ? null : "meta_reviewer",
      activeSince: input.activeSinceIso,
      lastCommandAt: input.lastCommandAtIso
    });
    await writeStateSnapshot(input.statePath, metaReviewRunning, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });
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

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:13:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("rework_delivery_failed");
    expect(result.intentId).toBe(queued.intentId);
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.deliveryError).toContain("rerun watchdog");

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
        emitTmuxDeliveryNotification: (input) => {
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
            delivered: true,
            message: "ok"
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
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_01",
      task: "Watchdog escalation task",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    const deliveryRefs: string[] = [];

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:31:00.000Z")
    }, {
      emitTmuxDeliveryNotification: (input) => {
        if (input.messageRef !== undefined) {
          deliveryRefs.push(input.messageRef);
        }
        return Promise.resolve({
          delivered: true,
          message: "ok"
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

  it("routes META_REVIEW_RUNNING timeout to META_REVIEW_FAILED with APPROVAL_REQUEST", async () => {
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
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(result.envelope?.type).toBe("APPROVAL_REQUEST");
    const summary = result.envelope?.payload.summary;
    expect(typeof summary).toBe("string");
    expect(summary).toContain("META_REVIEW_GATE_RUN_FAILED");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("APPROVAL_REQUEST");
    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.at(-1)?.type).toBe("APPROVAL_REQUEST");
  });

  it("still monitors META_REVIEW_RUNNING when active_agent is null in recovery state", async () => {
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
          last_autonomous_status: "success",
          last_autonomous_recommendation: "inconclusive",
          last_autonomous_summary: "Recovered meta-review snapshot prior to timeout route.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-02-22T12:00:30.000Z"
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:00:00.000Z")
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.envelope?.type).toBe("APPROVAL_REQUEST");
  });

  it("deactivates meta-reviewer pane binding when watchdog routes meta-review timeout", async () => {
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
    expect(sessions[bubble.bubbleId]?.metaReviewerPane?.active).toBe(false);
  });

  it("routes canonical META_REVIEW_RUNNING submit snapshot before timeout expiry", async () => {
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
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Canonical structured submit captured.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-02-22T12:01:00.000Z"
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:02:00.000Z")
    });

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.last_autonomous_run_id).toBeNull();
    expect(result.envelope?.type).toBe("APPROVAL_REQUEST");
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
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Structured submit exists but predates active window.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-02-22T11:59:59.000Z"
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      }
    );

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:02:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
  });

  it("does not fail watchdog cycle when meta-review routing sees state conflict before timeout", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_conflict_01",
      task: "Watchdog meta-review recover conflict (pre-timeout)",
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
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Canonical submit is present in active window.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-02-22T12:01:00.000Z"
        }
      },
      {
        expectedFingerprint: running.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      }
    );

    const result = await runBubbleWatchdog(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:02:00.000Z")
      },
      {
        recoverMetaReviewGateFromSnapshot: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_STATE_CONFLICT",
            "simulated conflict before timeout"
          );
        }
      }
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
  });

  it("does not fail watchdog cycle when timeout routing sees state conflict and lifecycle already progressed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_meta_conflict_02",
      task: "Watchdog meta-review recover conflict (timeout)",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    await moveToMetaReviewRunning({
      statePath: bubble.paths.statePath,
      activeSinceIso: "2026-02-22T12:00:00.000Z",
      lastCommandAtIso: "2026-02-22T12:00:00.000Z"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const progressed = applyStateTransition(loaded.state, {
      to: "META_REVIEW_FAILED",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-22T14:00:00.000Z"
    });
    let readCount = 0;

    const result = await runBubbleWatchdog(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T14:00:00.000Z")
      },
      {
        readStateSnapshot: async () => {
          readCount += 1;
          if (readCount === 1) {
            return loaded;
          }
          return {
            fingerprint: "fp_progressed",
            state: progressed
          };
        },
        recoverMetaReviewGateFromSnapshot: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_STATE_CONFLICT",
            "simulated timeout conflict"
          );
        }
      }
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("state_not_running");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });
});
