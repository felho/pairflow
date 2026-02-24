import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { normalizeRepoPath } from "../../../src/core/bubble/repoResolution.js";
import { createUiEventsBroker } from "../../../src/core/ui/events.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-ui-events-unit-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number = 4_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for condition.`);
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("createUiEventsBroker", () => {
  it("does not consume new event ids when generating snapshot views", async () => {
    const repoPath = await createTempRepo();
    const normalizedRepoPath = await normalizeRepoPath(repoPath);
    await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_unit_00",
      repoPath,
      task: "Snapshot id stability"
    });

    const broker = await createUiEventsBroker({
      repos: [normalizedRepoPath],
      pollIntervalMs: 100,
      debounceMs: 10
    });

    try {
      const first = broker.getSnapshot({
        repos: [normalizedRepoPath]
      });
      const second = broker.getSnapshot({
        repos: [normalizedRepoPath]
      });
      expect(second.id).toBe(first.id);
    } finally {
      await broker.close();
    }
  });

  it("allocates snapshot id monotonically so replay from snapshot id does not skip next event", async () => {
    const repoPath = await createTempRepo();
    const normalizedRepoPath = await normalizeRepoPath(repoPath);
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_unit_01",
      repoPath,
      task: "Validate snapshot id monotonicity"
    });

    const broker = await createUiEventsBroker({
      repos: [normalizedRepoPath],
      pollIntervalMs: 100,
      debounceMs: 10
    });

    const snapshot = broker.getSnapshot({
      repos: [normalizedRepoPath]
    });
    const replayedIds: number[] = [];

    const unsubscribe = broker.subscribe(
      {
        repos: [normalizedRepoPath],
        lastEventId: snapshot.id
      },
      (event) => {
        replayedIds.push(event.id);
      }
    );

    try {
      await emitAskHumanFromWorkspace({
        question: "Is this replay-safe?",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-24T19:00:00.000Z")
      });

      await waitFor(() => replayedIds.length > 0);
      expect(replayedIds[0]).toBeGreaterThan(snapshot.id);
    } finally {
      unsubscribe();
      await broker.close();
    }
  });
});
