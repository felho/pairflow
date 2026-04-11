import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyMetaReviewGateOnConvergenceV11 as applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshotV11 as recoverMetaReviewGateFromSnapshot
} from "../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import {
  readTranscriptEnvelopes
} from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  readStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-"));
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

describe("applyMetaReviewGateOnConvergence", () => {
  it("enters meta-review running state and appends a kickoff TASK", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_apply_01",
      task: "Meta-review apply happy path"
    });

    const result = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Ready for meta-review.",
      now: new Date("2026-03-13T12:00:00.000Z")
    }, {
      notifyMetaReviewerSubmissionRequest: async () => ({
        status: "confirmed",
        reasonCode: null,
        message: "ok"
      })
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");
    expect(result.state.state).toBe("RUNNING");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("TASK");
  });
});

describe("recoverMetaReviewGateFromSnapshot", () => {
  it("fails closed and leaves the running kickoff route untouched", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_removed_01",
      task: "Meta-review recover removed"
    });

    const started = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Ready for meta-review.",
      now: new Date("2026-03-13T12:00:00.000Z")
    }, {
      notifyMetaReviewerSubmissionRequest: async () => ({
        status: "confirmed",
        reasonCode: null,
        message: "ok"
      })
    });
    expect(started.route).toBe("meta_review_running");

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Attempt removed recovery route.",
        now: new Date("2026-03-13T12:01:00.000Z")
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("RUNNING");
    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("TASK");
  });
});
