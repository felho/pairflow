import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  emitApprove,
  emitRequestRework
} from "../../../src/core/human/approval.js";
import {
  emitApproveV11,
  emitRequestReworkV11
} from "../../../src/v11/application/approval/emitApprovalV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-approval-contract-"));
  try {
    await initGitRepository(repoPath);
    return await run(repoPath);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

async function seedReadyForHumanApprovalState(input: {
  repoPath: string;
  bubbleId: string;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Approval contract parity fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "READY_FOR_APPROVAL",
    lastCommandAt: "2026-03-19T21:00:00.000Z"
  });
  const legacyStateWithoutMetaReview = { ...transitioned };
  delete legacyStateWithoutMetaReview.meta_review;
  await writeStateSnapshot(
    bubble.paths.statePath,
    legacyStateWithoutMetaReview,
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
  return bubble;
}

async function seedWaitingHumanState(input: {
  repoPath: string;
  bubbleId: string;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Approval contract queued rework fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-19T21:05:00.000Z"
  });
  await writeStateSnapshot(bubble.paths.statePath, transitioned, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: "RUNNING"
  });
  return bubble;
}

describe("v11 approval contract parity", () => {
  it("keeps approve contract parity between core facade and v11 entrypoint", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await seedReadyForHumanApprovalState({
        repoPath,
        bubbleId: "b_approval_contract_legacy_approve"
      });
      return emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-19T21:10:00.000Z")
      });
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await seedReadyForHumanApprovalState({
        repoPath,
        bubbleId: "b_approval_contract_v11_approve"
      });
      return emitApproveV11({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-19T21:10:00.000Z")
      });
    });

    const normalize = (result: Awaited<typeof legacy>) => ({
      envelopeType: result.envelope.type,
      decision: result.envelope.payload.decision,
      recommendationAtDecision:
        result.envelope.payload.metadata?.recommendation_at_decision,
      state: result.state.state
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      envelopeType: "APPROVAL_DECISION",
      decision: "approve",
      recommendationAtDecision: "approve",
      state: "APPROVED_FOR_COMMIT"
    });
  });

  it("keeps queued request-rework contract parity between core facade and v11 entrypoint", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await seedWaitingHumanState({
        repoPath,
        bubbleId: "b_approval_contract_legacy_rework"
      });
      return emitRequestRework({
        bubbleId: bubble.bubbleId,
        message: "Please restart with updated test matrix.",
        cwd: repoPath,
        now: new Date("2026-03-19T21:15:00.000Z")
      });
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await seedWaitingHumanState({
        repoPath,
        bubbleId: "b_approval_contract_v11_rework"
      });
      return emitRequestReworkV11({
        bubbleId: bubble.bubbleId,
        message: "Please restart with updated test matrix.",
        cwd: repoPath,
        now: new Date("2026-03-19T21:15:00.000Z")
      });
    });

    expect(legacy.mode).toBe("queued");
    expect(v11.mode).toBe("queued");
    if (legacy.mode !== "queued" || v11.mode !== "queued") {
      throw new Error("Expected queued rework contract outputs.");
    }

    const normalizeQueued = (result: typeof legacy) => ({
      mode: result.mode,
      state: result.state.state,
      hasIntentId: result.intentId.startsWith("intent_"),
      hasSupersededIntentId: result.supersededIntentId !== undefined
    });

    expect(normalizeQueued(legacy)).toEqual(normalizeQueued(v11));
    expect(normalizeQueued(legacy)).toMatchObject({
      mode: "queued",
      state: "WAITING_HUMAN",
      hasIntentId: true,
      hasSupersededIntentId: false
    });
  });
});
