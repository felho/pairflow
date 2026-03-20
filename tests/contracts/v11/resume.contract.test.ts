import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resumeBubble } from "../../../src/core/bubble/resumeBubble.js";
import { resumeBubbleV11 } from "../../../src/v11/application/resume/emitResumeV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-resume-contract-"));
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
    task: "Resume contract parity fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-20T10:00:00.000Z"
  });
  await writeStateSnapshot(bubble.paths.statePath, transitioned, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: "RUNNING"
  });
  return bubble;
}

describe("v11 resume contract parity", () => {
  it("keeps core facade and v11 resume output parity from WAITING_HUMAN", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await seedWaitingHumanState({
        repoPath,
        bubbleId: "b_resume_contract_legacy"
      });
      return resumeBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T10:05:00.000Z")
      });
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await seedWaitingHumanState({
        repoPath,
        bubbleId: "b_resume_contract_v11"
      });
      return resumeBubbleV11({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T10:05:00.000Z")
      });
    });

    const normalize = (result: Awaited<typeof legacy>) => ({
      envelopeType: result.envelope.type,
      hasMessage: typeof result.envelope.payload.message === "string",
      state: result.state.state,
      round: result.state.round,
      activeRole: result.state.active_role
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      envelopeType: "HUMAN_REPLY",
      hasMessage: true,
      state: "RUNNING",
      round: 1,
      activeRole: "implementer"
    });
  });
});
