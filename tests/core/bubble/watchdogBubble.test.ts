import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { runBubbleWatchdog } from "../../../src/core/bubble/watchdogBubble.js";
import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitRequestRework } from "../../../src/core/human/approval.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
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

  it("escalates expired RUNNING watchdog to HUMAN_QUESTION + WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_01",
      task: "Watchdog escalation task",
      startedAt: "2026-02-22T12:00:00.000Z"
    });

    const result = await runBubbleWatchdog({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:12:00.000Z")
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
});
