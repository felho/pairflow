import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runBubbleWatchdogV11 } from "../../../../src/v11/application/watchdog/emitWatchdogV11.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-watchdog-v11-"));
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

describe("watchdogCommandApi", () => {
  it("escalates expired RUNNING watchdog to HUMAN_QUESTION + WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_01",
      task: "Watchdog v11 escalation",
      startedAt: "2026-02-22T12:00:00.000Z"
    });

    const result = await runBubbleWatchdogV11({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:31:00.000Z")
    }, {
      emitTmuxDeliveryNotification: () =>
        Promise.resolve({
          delivered: true,
          message: "ok"
        }),
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
    expect(result.state.state).toBe("WAITING_HUMAN");
  });
});
