import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { listBubbles } from "../../../src/core/bubble/listBubbles.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-parallel-bubbles-"));
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

describe("parallel bubbles smoke", () => {
  it("supports five concurrent bubble passes without transcript/state contamination", async () => {
    const repoPath = await createTempRepo();
    const bubbleIds = ["b_parallel_01", "b_parallel_02", "b_parallel_03", "b_parallel_04", "b_parallel_05"];

    const bubbles = [];
    for (const bubbleId of bubbleIds) {
      bubbles.push(
        await setupRunningBubbleFixture({
          repoPath,
          bubbleId,
          task: `Task for ${bubbleId}`
        })
      );
    }

    const passResults = await Promise.all(
      bubbles.map((bubble, index) =>
        emitPassFromWorkspace({
          summary: `Parallel pass ${index + 1}`,
          cwd: bubble.paths.worktreePath,
          now: new Date("2026-02-23T12:00:00.000Z")
        })
      )
    );

    expect(passResults).toHaveLength(5);
    for (let index = 0; index < bubbles.length; index += 1) {
      const bubble = bubbles[index];
      const result = passResults[index];
      if (bubble === undefined || result === undefined) {
        continue;
      }
      expect(result.bubbleId).toBe(bubble.bubbleId);
      expect(result.sequence).toBe(2);

      const [state, transcript] = await Promise.all([
        readStateSnapshot(bubble.paths.statePath),
        readTranscriptEnvelopes(bubble.paths.transcriptPath)
      ]);
      expect(state.state.state).toBe("RUNNING");
      expect(state.state.active_role).toBe("reviewer");
      expect(state.state.active_agent).toBe("claude");
      expect(transcript).toHaveLength(2);
      expect(transcript.every((entry) => entry.bubble_id === bubble.bubbleId)).toBe(
        true
      );
      expect(transcript.map((entry) => entry.type)).toEqual(["TASK", "PASS"]);
    }

    const listed = await listBubbles({ repoPath });
    expect(listed.total).toBe(5);
    expect(listed.byState.RUNNING).toBe(5);
  });
});
