import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { runBubbleWatchdog } from "../../../src/core/bubble/watchdogBubble.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
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

describe("runBubbleWatchdog", () => {
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
