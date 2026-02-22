import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitHumanReply } from "../../../src/core/human/reply.js";
import { getBubbleStatus } from "../../../src/core/bubble/statusBubble.js";
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
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

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
    expect(status.watchdog.timeoutMinutes).toBe(5);
    expect(status.watchdog.remainingSeconds).toBe(120);
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
});
