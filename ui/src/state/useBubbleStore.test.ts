import { describe, expect, it, vi } from "vitest";

import {
  createBubbleStore,
  selectStateCounts,
  selectVisibleBubbles,
  type BubbleStoreDependencies
} from "./useBubbleStore";
import type { PairflowApiClient } from "../lib/api";
import { PairflowApiError } from "../lib/api";
import type {
  BubblePosition,
  ConnectionStatus,
  UiEvent,
  UiRepoSummary
} from "../lib/types";
import { bubbleDetail, bubbleSummary, repoSummary } from "../test/fixtures";

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

function createApiStub(overrides: Partial<PairflowApiClient>): PairflowApiClient {
  return {
    getRepos: vi.fn(async () => []),
    getBubbles: vi.fn(async (repoPath: string) => ({
      repo: repoSummary(repoPath),
      bubbles: []
    })),
    getBubble: vi.fn(async (repoPath: string, bubbleId: string) =>
      bubbleDetail({ bubbleId, repoPath })
    ),
    getBubbleTimeline: vi.fn(async () => []),
    startBubble: vi.fn(async () => ({})),
    approveBubble: vi.fn(async () => ({})),
    requestRework: vi.fn(async () => ({})),
    replyBubble: vi.fn(async () => ({})),
    resumeBubble: vi.fn(async () => ({})),
    commitBubble: vi.fn(async () => ({})),
    mergeBubble: vi.fn(async () => ({})),
    openBubble: vi.fn(async () => ({})),
    attachBubble: vi.fn(async () => ({})),
    stopBubble: vi.fn(async () => ({})),
    ...overrides
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

    const api = createApiStub({
      getRepos: vi.fn(async () => repos),
      getBubbles
    });

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

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a", "/repo-b"]),
      getBubbles: vi.fn(async (repoPath: string) => ({
        repo: repoSummary(repoPath),
        bubbles: repoPath === "/repo-a" ? [bubbleA] : [bubbleB]
      }))
    });

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
      api: createApiStub({
        getRepos: vi.fn(async () => []),
        getBubbles: vi.fn(async () => ({
          repo: repoSummary("/repo-a"),
          bubbles: []
        }))
      }),
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
        api: createApiStub({
          getRepos: vi.fn(async () => ["/repo-a"]),
          getBubbles: vi.fn(async () => ({
            repo: repoSummary("/repo-a"),
            bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
          }))
        }),
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

    const api = createApiStub({
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
    });

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

    const api = createApiStub({
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
    });

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

  it("refetches bubble state and sets retry hint after 409 action conflict", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a", state: "RUNNING" })]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            state: "WAITING_HUMAN"
          })
        ]
      });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      startBubble: vi.fn(async () => {
        throw new PairflowApiError({
          message: "state changed",
          status: 409,
          code: "conflict"
        });
      })
    });

    const store = createBubbleStore({
      api,
      createEventsClient: () => ({
        start: () => undefined,
        stop: () => undefined,
        refresh: () => undefined
      })
    });

    await store.getState().initialize();

    await expect(
      store.getState().runBubbleAction({
        bubbleId: "b-a",
        action: "start"
      })
    ).rejects.toBeInstanceOf(PairflowApiError);

    expect(getBubbles).toHaveBeenCalledTimes(2);
    expect(store.getState().bubblesById["b-a"]?.state).toBe("WAITING_HUMAN");
    expect(store.getState().actionRetryHintById["b-a"]).toContain(
      "State changed in CLI/UI"
    );
  });

  it("toggleBubbleExpanded expands and fetches detail, collapseBubble removes from list", async () => {
    const detail = bubbleDetail({ bubbleId: "b-a", repoPath: "/repo-a" });
    const timeline = [
      {
        id: "env-1",
        ts: "2026-02-24T12:01:00.000Z",
        round: 3,
        type: "HUMAN_QUESTION" as const,
        sender: "human",
        recipient: "codex",
        payload: { question: "Can you proceed?" },
        refs: []
      }
    ];

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })),
      getBubble: vi.fn(async () => detail),
      getBubbleTimeline: vi.fn(async () => timeline)
    });

    const storage = new MemoryStorage();
    const store = createBubbleStore({
      api,
      storage,
      createEventsClient: () => ({
        start: () => undefined,
        stop: () => undefined,
        refresh: () => undefined
      })
    });

    await store.getState().initialize();

    // Initially no expanded bubbles
    expect(store.getState().expandedBubbleIds).toEqual([]);

    // Toggle expand
    await store.getState().toggleBubbleExpanded("b-a");
    expect(store.getState().expandedBubbleIds).toEqual(["b-a"]);
    expect(store.getState().bubbleDetails["b-a"]).toBeDefined();
    expect(store.getState().bubbleTimelines["b-a"]).toEqual(timeline);

    // Persisted to storage
    expect(
      JSON.parse(storage.getItem("pairflow.ui.canvas.expandedIds.v1") ?? "[]")
    ).toEqual(["b-a"]);

    // Collapse
    store.getState().collapseBubble("b-a");
    expect(store.getState().expandedBubbleIds).toEqual([]);
    expect(
      JSON.parse(storage.getItem("pairflow.ui.canvas.expandedIds.v1") ?? "[]")
    ).toEqual([]);
  });

  it("toggleBubbleExpanded collapses when already expanded", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      }))
    });

    const store = createBubbleStore({
      api,
      createEventsClient: () => ({
        start: () => undefined,
        stop: () => undefined,
        refresh: () => undefined
      })
    });

    await store.getState().initialize();

    await store.getState().toggleBubbleExpanded("b-a");
    expect(store.getState().expandedBubbleIds).toEqual(["b-a"]);

    // Toggle again to collapse
    await store.getState().toggleBubbleExpanded("b-a");
    expect(store.getState().expandedBubbleIds).toEqual([]);
  });

  it("expandedPositions are persisted and pruned with bubbles", async () => {
    const storage = new MemoryStorage();
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      }))
    });

    let emitEvent: (event: UiEvent) => void = () => undefined;
    const store = createBubbleStore({
      api,
      storage,
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

    store.getState().setExpandedPosition("b-a", { x: 100, y: 200 });
    store.getState().persistExpandedPositions();

    expect(
      JSON.parse(storage.getItem("pairflow.ui.canvas.expandedPositions.v1") ?? "{}")
    ).toEqual({ "b-a": { x: 100, y: 200 } });

    // Remove bubble — expanded positions should be pruned
    emitEvent({
      id: 10,
      ts: "2026-02-24T12:10:00.000Z",
      type: "bubble.removed",
      repoPath: "/repo-a",
      bubbleId: "b-a"
    });

    expect(store.getState().expandedPositions).toEqual({});
  });

  it("restores expandedBubbleIds from localStorage on startup", async () => {
    const storage = new MemoryStorage();
    storage.setItem("pairflow.ui.canvas.expandedIds.v1", JSON.stringify(["b-a"]));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      }))
    });

    const store = createBubbleStore({
      api,
      storage,
      createEventsClient: () => ({
        start: () => undefined,
        stop: () => undefined,
        refresh: () => undefined
      })
    });

    // Before initialize, the IDs are already loaded from storage
    expect(store.getState().expandedBubbleIds).toEqual(["b-a"]);

    // After initialize, the bubble exists so it survives pruning
    await store.getState().initialize();
    expect(store.getState().expandedBubbleIds).toEqual(["b-a"]);

    // Detail was fetched for the expanded bubble
    expect(api.getBubble).toHaveBeenCalledWith("/repo-a", "b-a");
  });
});
