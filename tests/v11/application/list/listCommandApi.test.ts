import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../../src/v11/application/create/createCommandApi.js";
import { upsertRuntimeSession } from "../../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { listBubbles } from "../../../../src/v11/shared/read-model/list/listReadModelApi.js";
import { initGitRepository } from "../../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-v11-bubble-list-"));
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

describe("v11 list command api", () => {
  it("lists bubble summaries and runtime session counts from the v11 source of truth", async () => {
    const repoPath = await createTempRepo();

    const createdBubble = await createBubble({
      id: "b_v11_list_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Created only",
      cwd: repoPath
    });
    const runningBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_v11_list_02",
      task: "Running bubble"
    });

    await upsertRuntimeSession({
      sessionsPath: createdBubble.paths.sessionsPath,
      bubbleId: runningBubble.bubbleId,
      repoPath,
      worktreePath: runningBubble.paths.worktreePath,
      tmuxSessionName: "pf-b_v11_list_02",
      now: new Date("2026-02-22T18:00:00.000Z")
    });

    const listed = await listBubbles({ repoPath });

    expect(listed.total).toBe(2);
    expect(listed.bubbles.map((entry) => entry.bubbleId)).toEqual([
      "b_v11_list_01",
      "b_v11_list_02"
    ]);
    expect(listed.byState.CREATED).toBe(1);
    expect(listed.byState.RUNNING).toBe(1);
    expect(listed.runtimeSessions.registered).toBe(1);
    expect(listed.runtimeSessions.stale).toBe(0);
    expect(listed.bubbles[0]?.reviewPolicy).toEqual({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      reviewer_blocking_min_severity: "P3",
      meta_review_auto_rework_min_severity: "P3",
      meta_review_consecutive_clean_runs_required: 2,
    });
    expect(listed.bubbles[1]?.runtimeSession?.tmuxSessionName).toBe(
      "pf-b_v11_list_02"
    );
    for (const entry of listed.bubbles) {
      expect(entry.metaReview).not.toHaveProperty("consecutive_clean_runs");
    }
  });
});
