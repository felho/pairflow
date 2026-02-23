import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { listBubbles } from "../../../src/core/bubble/listBubbles.js";
import { emitHumanReply } from "../../../src/core/human/reply.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-parallel-soak-"));
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

describe("parallel bubbles soak", () => {
  it("keeps transcript/inbox/state isolated under repeated pass + ask/reply cycles", async () => {
    const repoPath = await createTempRepo();
    const bubbleIds = [
      "b_soak_01",
      "b_soak_02",
      "b_soak_03",
      "b_soak_04",
      "b_soak_05"
    ];
    const bubbles = [];
    for (const bubbleId of bubbleIds) {
      bubbles.push(
        await setupRunningBubbleFixture({
          repoPath,
          bubbleId,
          task: `Soak task ${bubbleId}`
        })
      );
    }

    await Promise.all(
      bubbles.map(async (bubble, index) => {
        const secondOffset = index.toString().padStart(2, "0");
        await emitPassFromWorkspace({
          summary: `pass-1 ${bubble.bubbleId}`,
          cwd: bubble.paths.worktreePath,
          now: new Date(`2026-02-23T12:00:${secondOffset}.000Z`)
        });
        await emitPassFromWorkspace({
          summary: `pass-2 ${bubble.bubbleId}`,
          noFindings: true,
          cwd: bubble.paths.worktreePath,
          now: new Date(`2026-02-23T12:01:${secondOffset}.000Z`)
        });
        await emitAskHumanFromWorkspace({
          question: `question ${bubble.bubbleId}`,
          cwd: bubble.paths.worktreePath,
          now: new Date(`2026-02-23T12:02:${secondOffset}.000Z`)
        });
        await emitHumanReply({
          bubbleId: bubble.bubbleId,
          repoPath,
          message: `reply ${bubble.bubbleId}`,
          now: new Date(`2026-02-23T12:03:${secondOffset}.000Z`)
        });
        await emitPassFromWorkspace({
          summary: `pass-3 ${bubble.bubbleId}`,
          cwd: bubble.paths.worktreePath,
          now: new Date(`2026-02-23T12:04:${secondOffset}.000Z`)
        });
      })
    );

    for (const bubble of bubbles) {
      const [state, transcript, inbox] = await Promise.all([
        readStateSnapshot(bubble.paths.statePath),
        readTranscriptEnvelopes(bubble.paths.transcriptPath),
        readTranscriptEnvelopes(bubble.paths.inboxPath, { allowMissing: true })
      ]);

      expect(state.state.state).toBe("RUNNING");
      expect(state.state.round).toBe(2);
      expect(state.state.active_role).toBe("reviewer");
      expect(state.state.active_agent).toBe("claude");

      expect(transcript.map((entry) => entry.type)).toEqual([
        "TASK",
        "PASS",
        "PASS",
        "HUMAN_QUESTION",
        "HUMAN_REPLY",
        "PASS"
      ]);
      expect(transcript.every((entry) => entry.bubble_id === bubble.bubbleId)).toBe(
        true
      );

      expect(inbox.map((entry) => entry.type)).toEqual([
        "HUMAN_QUESTION",
        "HUMAN_REPLY"
      ]);
      expect(inbox.every((entry) => entry.bubble_id === bubble.bubbleId)).toBe(true);
    }

    const listed = await listBubbles({ repoPath });
    expect(listed.total).toBe(5);
    expect(listed.byState.RUNNING).toBe(5);
  });
});
