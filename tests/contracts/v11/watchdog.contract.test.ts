import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runBubbleWatchdog } from "../../../src/core/bubble/watchdogBubble.js";
import { runBubbleWatchdogV11 } from "../../../src/v11/application/watchdog/emitWatchdogV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-watchdog-contract-"));
  try {
    await initGitRepository(repoPath);
    return await run(repoPath);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

async function seedWaitingHumanState(input: {
  repoPath: string;
  bubbleId: string;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Watchdog contract parity fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-20T10:20:00.000Z"
  });
  await writeStateSnapshot(bubble.paths.statePath, transitioned, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: "RUNNING"
  });
  return bubble;
}

describe("v11 watchdog contract parity", () => {
  it("keeps core facade and v11 watchdog output parity for WAITING_HUMAN no-op", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await seedWaitingHumanState({
        repoPath,
        bubbleId: "b_watchdog_contract_legacy"
      });
      return runBubbleWatchdog({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T10:25:00.000Z")
      });
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await seedWaitingHumanState({
        repoPath,
        bubbleId: "b_watchdog_contract_v11"
      });
      return runBubbleWatchdogV11({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T10:25:00.000Z")
      });
    });

    const normalize = (result: Awaited<typeof legacy>) => ({
      escalated: result.escalated,
      reason: result.reason,
      state: result.state.state,
      hasEnvelope: result.envelope !== undefined
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      escalated: false,
      reason: "not_expired",
      state: "WAITING_HUMAN",
      hasEnvelope: false
    });
  });
});
