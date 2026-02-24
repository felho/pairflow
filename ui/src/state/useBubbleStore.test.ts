import { describe, expect, it, vi } from "vitest";

import {
  createBubbleStore,
  selectStateCounts,
  selectVisibleBubbles,
  type BubbleStoreDependencies
} from "./useBubbleStore";
import type { PairflowApiClient } from "../lib/api";
import type {
  BubblePosition,
  ConnectionStatus,
  UiEvent,
  UiRepoSummary
} from "../lib/types";
import { bubbleSummary, repoSummary } from "../test/fixtures";

class MemoryStorage {
  private readonly records = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.records.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.records.set(key, value);
  }
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason?: unknown): void;
} {
  let resolve: ((value: T) => void) | null = null;
  let reject: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  if (resolve === null || reject === null) {
    throw new Error("Failed to create deferred promise handlers");
  }
  return {
    promise,
    resolve,
    reject
  };
}

describe("createBubbleStore", () => {
  it("loads initial data, tracks runtime session presence, and applies stream events", async () => {
    const repos = ["/repo-a", "/repo-b"];
    const bubbleA = bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" });
    const bubbleB = bubbleSummary({
      bubbleId: "b-b",
      repoPath: "/repo-b",
      runtimeSession: null
    });

    const getBubbles = vi
      .fn<
        (repoPath: string) => Promise<{ repo: UiRepoSummary; bubbles: typeof bubbleA[] }>
      >()
      .mockImplementation(async (repoPath) => {
        if (repoPath === "/repo-a") {
          return {
            repo: repoSummary("/repo-a"),
            bubbles: [bubbleA]
          };
        }
        return {
          repo: repoSummary("/repo-b"),
          bubbles: [bubbleB]
        };
      });

    const api: PairflowApiClient = {
      getRepos: vi.fn(async () => repos),
      getBubbles
    };

    let emitEvent: (event: UiEvent) => void = () => undefined;
    let emitStatus: (status: ConnectionStatus) => void = () => undefined;

    const client = {
      start: vi.fn(() => {
        emitStatus("connected");
      }),
      stop: vi.fn(),
      refresh: vi.fn()
    };

    const storage = new MemoryStorage();

    const dependencies: BubbleStoreDependencies = {
      api,
      storage,
      createEventsClient: (input) => {
        emitEvent = input.onEvent;
        emitStatus = input.onStatus;
        return client;
      }
    };

    const store = createBubbleStore(dependencies);

    await store.getState().initialize();

    expect(store.getState().repos).toEqual(repos);
    expect(store.getState().selectedRepos).toEqual(repos);
    expect(store.getState().connectionStatus).toBe("connected");

    const visible = selectVisibleBubbles(store.getState());
    expect(visible).toHaveLength(2);
    expect(visible.find((bubble) => bubble.bubbleId === "b-a")?.hasRuntimeSession).toBe(
      true
    );
    expect(visible.find((bubble) => bubble.bubbleId === "b-b")?.hasRuntimeSession).toBe(
      false
    );

    emitEvent({
      id: 8,
      ts: "2026-02-24T12:10:00.000Z",
      type: "bubble.removed",
      repoPath: "/repo-a",
      bubbleId: "b-a"
    });

    expect(selectVisibleBubbles(store.getState()).map((bubble) => bubble.bubbleId)).toEqual([
      "b-b"
    ]);

    emitEvent({
      id: 9,
      ts: "2026-02-24T12:12:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-b",
      bubbleId: "b-b",
      bubble: {
        ...bubbleB,
        repoPath: "/repo-a"
      }
    });

    expect(store.getState().bubblesById["b-b"]?.repoPath).toBe("/repo-a");

    await store.getState().toggleRepo("/repo-b");
    expect(store.getState().selectedRepos).toEqual(["/repo-a"]);
    expect(client.refresh).toHaveBeenCalledTimes(1);

    const counts = selectStateCounts(store.getState());
    expect(counts.RUNNING).toBe(1);
  });

  it("applies snapshot events by replacing only scoped repos", async () => {
    const bubbleA = bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" });
    const bubbleB = bubbleSummary({
      bubbleId: "b-b",
      repoPath: "/repo-b"
    });

    const api: PairflowApiClient = {
      getRepos: vi.fn(async () => ["/repo-a", "/repo-b"]),
      getBubbles: vi.fn(async (repoPath: string) => ({
        repo: repoSummary(repoPath),
        bubbles: repoPath === "/repo-a" ? [bubbleA] : [bubbleB]
      }))
    };

    let emitEvent: (event: UiEvent) => void = () => undefined;

    const store = createBubbleStore({
      api,
      createEventsClient: (input) => {
        emitEvent = input.onEvent;
        return {
          start: () => undefined,
          stop: () => undefined,
          refresh: () => undefined
        };
      }
    });

    await store.getState().initialize();

    expect(selectVisibleBubbles(store.getState()).map((bubble) => bubble.bubbleId)).toEqual([
      "b-a",
      "b-b"
    ]);

    emitEvent({
      id: 20,
      ts: "2026-02-24T12:20:00.000Z",
      type: "snapshot",
      repos: [repoSummary("/repo-a")],
      bubbles: []
    });

    // Snapshot is repo-scoped: /repo-a entries are replaced, /repo-b stays untouched.
    expect(selectVisibleBubbles(store.getState()).map((bubble) => bubble.bubbleId)).toEqual([
      "b-b"
    ]);
  });

  it("persists positions only when explicitly committed", () => {
    const storage = new MemoryStorage();
    const store = createBubbleStore({
      api: {
        getRepos: vi.fn(async () => []),
        getBubbles: vi.fn(async () => ({
          repo: repoSummary("/repo-a"),
          bubbles: []
        }))
      },
      storage,
      createEventsClient: () => ({
        start: () => undefined,
        stop: () => undefined,
        refresh: () => undefined
      })
    });

    const position: BubblePosition = {
      x: 120,
      y: 88
    };

    store.getState().setPosition("b-1", position);

    expect(storage.getItem("pairflow.ui.canvas.positions.v1")).toBeNull();

    store.getState().persistPositions();

    expect(JSON.parse(storage.getItem("pairflow.ui.canvas.positions.v1") ?? "{}")).toEqual({
      "b-1": position
    });
  });

  it("does not share count object instances across separate stores", async () => {
    const createStoreWithRunningBubble = () =>
      createBubbleStore({
        api: {
          getRepos: vi.fn(async () => ["/repo-a"]),
          getBubbles: vi.fn(async () => ({
            repo: repoSummary("/repo-a"),
            bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
          }))
        },
        createEventsClient: () => ({
          start: () => undefined,
          stop: () => undefined,
          refresh: () => undefined
        })
      });

    const storeA = createStoreWithRunningBubble();
    const storeB = createStoreWithRunningBubble();

    await storeA.getState().initialize();
    await storeB.getState().initialize();

    const countsA = selectStateCounts(storeA.getState());
    const countsB = selectStateCounts(storeB.getState());

    expect(countsA).toEqual(countsB);
    expect(countsA).not.toBe(countsB);
  });

  it("clears stale error immediately when toggling repo", async () => {
    const deferredRepoLoad = createDeferred<{
      repo: UiRepoSummary;
      bubbles: ReturnType<typeof bubbleSummary>[];
    }>();

    const api: PairflowApiClient = {
      getRepos: vi.fn(async () => ["/repo-a", "/repo-b"]),
      getBubbles: vi
        .fn()
        .mockResolvedValueOnce({
          repo: repoSummary("/repo-a"),
          bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
        })
        .mockResolvedValueOnce({
          repo: repoSummary("/repo-b"),
          bubbles: []
        })
        .mockImplementationOnce(async () => deferredRepoLoad.promise)
    };

    const store = createBubbleStore({
      api,
      createEventsClient: () => ({
        start: () => undefined,
        stop: () => undefined,
        refresh: () => undefined
      })
    });

    await store.getState().initialize();
    store.setState({
      error: "Old error"
    });

    const togglePromise = store.getState().toggleRepo("/repo-b");
    expect(store.getState().error).toBeNull();

    deferredRepoLoad.resolve({
      repo: repoSummary("/repo-b"),
      bubbles: []
    });
    await togglePromise;
  });

  it("ignores stale initialize completion when a newer initialize starts", async () => {
    const firstRepos = createDeferred<string[]>();
    const secondRepos = createDeferred<string[]>();

    const api: PairflowApiClient = {
      getRepos: vi
        .fn<() => Promise<string[]>>()
        .mockImplementationOnce(async () => firstRepos.promise)
        .mockImplementationOnce(async () => secondRepos.promise),
      getBubbles: vi.fn(async (repoPath: string) => ({
        repo: repoSummary(repoPath),
        bubbles: [
          bubbleSummary({
            bubbleId: repoPath === "/repo-a" ? "b-a" : "b-b",
            repoPath
          })
        ]
      }))
    };

    const store = createBubbleStore({
      api,
      createEventsClient: () => ({
        start: () => undefined,
        stop: () => undefined,
        refresh: () => undefined
      })
    });

    const firstInitialize = store.getState().initialize();
    const secondInitialize = store.getState().initialize();

    secondRepos.resolve(["/repo-b"]);
    await secondInitialize;

    expect(store.getState().repos).toEqual(["/repo-b"]);
    expect(Object.keys(store.getState().bubblesById)).toEqual(["b-b"]);

    firstRepos.resolve(["/repo-a"]);
    await firstInitialize;

    expect(store.getState().repos).toEqual(["/repo-b"]);
    expect(Object.keys(store.getState().bubblesById)).toEqual(["b-b"]);
  });
});
