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

  it("supports dynamic repo add/remove with immediate events", async () => {
    const repoA = await createTempRepo();
    const repoB = await createTempRepo();
    const normalizedRepoA = await normalizeRepoPath(repoA);
    const normalizedRepoB = await normalizeRepoPath(repoB);
    const bubbleB = await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_unit_02",
      repoPath: repoB,
      task: "Dynamic repo add/remove"
    });

    const broker = await createUiEventsBroker({
      repos: [normalizedRepoA],
      pollIntervalMs: 100,
      debounceMs: 10
    });

    const receivedTypes: string[] = [];
    const receivedBubbleIds: string[] = [];
    const receivedRepoPaths: string[] = [];
    const receivedEvents: Array<{
      type: string;
      repoPath: string;
      bubbleId?: string | undefined;
    }> = [];
    const unsubscribe = broker.subscribe({}, (event) => {
      receivedTypes.push(event.type);
      if (event.type === "snapshot") {
        return;
      }
      receivedEvents.push({
        type: event.type,
        repoPath: event.repoPath,
        ...("bubbleId" in event ? { bubbleId: event.bubbleId } : {})
      });
      if (
        (event.type === "bubble.updated" || event.type === "bubble.removed") &&
        "bubbleId" in event
      ) {
        receivedBubbleIds.push(event.bubbleId);
      }
      if (event.type === "repo.updated" || event.type === "repo.removed") {
        receivedRepoPaths.push(event.repoPath);
      }
    });

    try {
      const addStartIndex = receivedEvents.length;
      const added = await broker.addRepo(normalizedRepoB);
      expect(added).toBe(true);
      await waitFor(() => receivedTypes.includes("bubble.updated"));
      expect(receivedBubbleIds).toContain(bubbleB.bubbleId);
      const addEvents = receivedEvents.slice(addStartIndex);
      const firstRepoUpdatedIndex = addEvents.findIndex(
        (event) =>
          event.type === "repo.updated" && event.repoPath === normalizedRepoB
      );
      const firstBubbleUpdatedIndex = addEvents.findIndex(
        (event) =>
          event.type === "bubble.updated" &&
          event.repoPath === normalizedRepoB &&
          event.bubbleId === bubbleB.bubbleId
      );
      expect(firstRepoUpdatedIndex).toBeGreaterThanOrEqual(0);
      expect(firstBubbleUpdatedIndex).toBeGreaterThanOrEqual(0);
      expect(firstRepoUpdatedIndex).toBeLessThan(firstBubbleUpdatedIndex);

      const removed = await broker.removeRepo(normalizedRepoB);
      expect(removed).toBe(true);
      await waitFor(() => receivedTypes.includes("bubble.removed"));
      await waitFor(() => receivedTypes.includes("repo.removed"));
      expect(receivedBubbleIds).toContain(bubbleB.bubbleId);
      expect(receivedRepoPaths).toContain(normalizedRepoB);
      const snapshot = broker.getSnapshot({
        repos: [normalizedRepoB]
      });
      expect(snapshot.repos).toEqual([]);
    } finally {
      unsubscribe();
      await broker.close();
    }
  });

  it("deduplicates concurrent addRepo calls for the same repository", async () => {
    const repoA = await createTempRepo();
    const repoB = await createTempRepo();
    const normalizedRepoA = await normalizeRepoPath(repoA);
    const normalizedRepoB = await normalizeRepoPath(repoB);
    await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_unit_03",
      repoPath: repoB,
      task: "Concurrent add dedupe"
    });

    const broker = await createUiEventsBroker({
      repos: [normalizedRepoA],
      pollIntervalMs: 100,
      debounceMs: 10
    });

    const repoUpdatedEvents: string[] = [];
    const unsubscribe = broker.subscribe({}, (event) => {
      if (event.type === "repo.updated") {
        repoUpdatedEvents.push(event.repoPath);
      }
    });

    try {
      const results = await Promise.all([
        broker.addRepo(normalizedRepoB),
        broker.addRepo(normalizedRepoB)
      ]);
      expect(results).toEqual([true, true]);

      await waitFor(
        () =>
          repoUpdatedEvents.filter((repoPath) => repoPath === normalizedRepoB)
            .length === 1
      );

      const snapshot = broker.getSnapshot({
        repos: [normalizedRepoB]
      });
      expect(snapshot.repos).toHaveLength(1);
      expect(snapshot.repos[0]?.repoPath).toBe(normalizedRepoB);
    } finally {
      unsubscribe();
      await broker.close();
    }
  });

  it("deduplicates concurrent removeRepo calls for the same repository", async () => {
    const repoA = await createTempRepo();
    const repoB = await createTempRepo();
    const normalizedRepoA = await normalizeRepoPath(repoA);
    const normalizedRepoB = await normalizeRepoPath(repoB);
    const bubbleB = await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_unit_04",
      repoPath: repoB,
      task: "Concurrent remove dedupe"
    });

    const broker = await createUiEventsBroker({
      repos: [normalizedRepoA, normalizedRepoB],
      pollIntervalMs: 100,
      debounceMs: 10
    });

    const removedRepoEvents: string[] = [];
    const removedBubbleEvents: string[] = [];
    const unsubscribe = broker.subscribe({}, (event) => {
      if (event.type === "repo.removed") {
        removedRepoEvents.push(event.repoPath);
      }
      if (event.type === "bubble.removed") {
        removedBubbleEvents.push(event.bubbleId);
      }
    });

    try {
      const results = await Promise.all([
        broker.removeRepo(normalizedRepoB),
        broker.removeRepo(normalizedRepoB)
      ]);
      expect(results).toEqual([true, true]);

      await waitFor(
        () =>
          removedRepoEvents.filter((repoPath) => repoPath === normalizedRepoB)
            .length === 1
      );
      await waitFor(
        () =>
          removedBubbleEvents.filter((bubbleId) => bubbleId === bubbleB.bubbleId)
            .length === 1
      );

      const snapshot = broker.getSnapshot({
        repos: [normalizedRepoB]
      });
      expect(snapshot.repos).toEqual([]);
    } finally {
      unsubscribe();
      await broker.close();
    }
  });

  it("serializes concurrent add/remove operations for the same repository", async () => {
    const repoA = await createTempRepo();
    const repoB = await createTempRepo();
    const normalizedRepoA = await normalizeRepoPath(repoA);
    const normalizedRepoB = await normalizeRepoPath(repoB);
    await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_unit_05",
      repoPath: repoB,
      task: "Concurrent add/remove serialization"
    });

    const broker = await createUiEventsBroker({
      repos: [normalizedRepoA],
      pollIntervalMs: 100,
      debounceMs: 10
    });

    const repoUpdatedEvents: string[] = [];
    const repoRemovedEvents: string[] = [];
    const unsubscribe = broker.subscribe({}, (event) => {
      if (event.type === "repo.updated") {
        repoUpdatedEvents.push(event.repoPath);
      }
      if (event.type === "repo.removed") {
        repoRemovedEvents.push(event.repoPath);
      }
    });

    try {
      const results = await Promise.all([
        broker.addRepo(normalizedRepoB),
        broker.removeRepo(normalizedRepoB)
      ]);
      expect(results).toEqual([true, true]);

      await waitFor(
        () =>
          repoUpdatedEvents.filter((repoPath) => repoPath === normalizedRepoB)
            .length === 1
      );
      await waitFor(
        () =>
          repoRemovedEvents.filter((repoPath) => repoPath === normalizedRepoB)
            .length === 1
      );

      const snapshot = broker.getSnapshot({
        repos: [normalizedRepoB]
      });
      expect(snapshot.repos).toEqual([]);
    } finally {
      unsubscribe();
      await broker.close();
    }
  });

  it("clears in-flight markers after cross-kind operations on the same repo", async () => {
    const repoA = await createTempRepo();
    const repoB = await createTempRepo();
    const normalizedRepoA = await normalizeRepoPath(repoA);
    const normalizedRepoB = await normalizeRepoPath(repoB);
    await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_unit_06",
      repoPath: repoB,
      task: "Cross kind in-flight cleanup"
    });

    const broker = await createUiEventsBroker({
      repos: [normalizedRepoA],
      pollIntervalMs: 100,
      debounceMs: 10
    });

    const repoUpdatedEvents: string[] = [];
    const unsubscribe = broker.subscribe({}, (event) => {
      if (event.type === "repo.updated") {
        repoUpdatedEvents.push(event.repoPath);
      }
    });

    try {
      const firstWave = await Promise.all([
        broker.addRepo(normalizedRepoB),
        broker.removeRepo(normalizedRepoB)
      ]);
      expect(firstWave).toEqual([true, true]);

      const secondAdd = await broker.addRepo(normalizedRepoB);
      expect(secondAdd).toBe(true);

      await waitFor(
        () =>
          repoUpdatedEvents.filter((repoPath) => repoPath === normalizedRepoB)
            .length === 2
      );

      const snapshot = broker.getSnapshot({
        repos: [normalizedRepoB]
      });
      expect(snapshot.repos).toHaveLength(1);
    } finally {
      unsubscribe();
      await broker.close();
    }
  });
});
