import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyMetaReviewGateOnConvergenceV11 as applyMetaReviewGateOnConvergence
} from "../../../src/v11/defaults/metaReviewGate/metaReviewGateApi.js";
import {
  readTranscriptEnvelopes
} from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];
const noRuntimeSessionPaneBinding = async () => ({
  updated: false as const,
  reason: "no_runtime_session" as const
});

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
      setMetaReviewerPaneBinding: noRuntimeSessionPaneBinding,
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
