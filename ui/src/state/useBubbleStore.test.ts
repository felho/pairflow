import { beforeEach, describe, expect, it, vi } from "vitest";

const { copyToClipboardMock } = vi.hoisted(() => ({
  copyToClipboardMock: vi.fn<(text: string) => Promise<void>>()
}));

vi.mock("../lib/clipboard", () => ({
  copyToClipboard: copyToClipboardMock
}));

import {
  createBubbleStore,
  selectVisibleBubbles,
  type BubbleStoreDependencies
} from "./useBubbleStore";
import type { PairflowApiClient } from "../lib/api";
import { PairflowApiError } from "../lib/api";
import { defaultPosition } from "../lib/canvasLayout";
import type {
  BubbleDeleteResult,
  BubblePosition,
  ConnectionStatus,
  UiBubbleDetail,
  UiEvent,
  UiTimelineEntry,
  UiRepoSummary
} from "../lib/types";
import { bubbleDetail, bubbleSummary, repoSummary, timelineEntry } from "../test/fixtures";

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
    updateReviewPolicy: vi.fn(async () => ({
      kind: "review_policy_updated" as const,
      bubbleId: "unknown",
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        reviewer_blocking_min_severity: "P1" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        meta_review_consecutive_clean_runs_required: 1
      },
      previousRequestedLoopMode: "full" as const,
      nextRequestedLoopMode: "meta_only" as const,
      activationChange: "none" as const,
      bubbleToml: ""
    })),
    restartBubble: vi.fn(async () => ({})),
    commitBubble: vi.fn(async () => ({})),
    mergeBubble: vi.fn(async () => ({})),
    openBubble: vi.fn(async () => ({})),
    attachBubble: vi.fn(async () => ({
      bubbleId: "unknown",
      tmuxSessionName: "pf-unknown",
      launcherRequested: "auto",
      launcherUsed: "terminal"
    })),
    stopBubble: vi.fn(async () => ({})),
    deleteBubble: vi.fn(async () => ({
      bubbleId: "unknown",
      deleted: true,
      requiresConfirmation: false,
      artifacts: {
        worktree: { exists: false, path: "" },
        tmux: { exists: false, sessionName: "" },
        runtimeSession: { exists: false, sessionName: null },
        branch: { exists: false, name: "" }
      },
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false,
      removedWorktree: false,
      removedBubbleBranch: false
    } satisfies BubbleDeleteResult)),
    ...overrides
  };
}

describe("createBubbleStore", () => {
  beforeEach(() => {
    copyToClipboardMock.mockReset();
    copyToClipboardMock.mockResolvedValue(undefined);
  });

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
  });

  it("uses stageAll for commit actions and preserves the default staging behavior", async () => {
    const commitBubble = vi.fn(async () => ({}));
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            state: "APPROVED_FOR_COMMIT"
          })
        ]
      })),
      commitBubble
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

    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "commit",
      message: "  Ship it  ",
      refs: ["artifacts/commit-evidence.md"]
    });
    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "commit",
      stageAll: false
    });

    expect(commitBubble).toHaveBeenNthCalledWith(
      1,
      "/repo-a",
      "b-a",
      {
        stageAll: true,
        message: "Ship it",
        refs: ["artifacts/commit-evidence.md"]
      }
    );
    expect(commitBubble).toHaveBeenNthCalledWith(
      2,
      "/repo-a",
      "b-a",
      {
        stageAll: false
      }
    );
  });

  it("auto-selects newly discovered repos on reinitialize without re-enabling manually hidden repos", async () => {
    let repos = ["/repo-a", "/repo-b"];
    const bubblesByRepo = new Map([
      ["/repo-a", [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]],
      ["/repo-b", [bubbleSummary({ bubbleId: "b-b", repoPath: "/repo-b" })]],
      ["/repo-c", [bubbleSummary({ bubbleId: "b-c", repoPath: "/repo-c" })]]
    ]);

    const api = createApiStub({
      getRepos: vi.fn(async () => repos),
      getBubbles: vi.fn(async (repoPath: string) => ({
        repo: repoSummary(repoPath),
        bubbles: bubblesByRepo.get(repoPath) ?? []
      }))
    });

    const client = {
      start: vi.fn(),
      stop: vi.fn(),
      refresh: vi.fn()
    };

    const store = createBubbleStore({
      api,
      createEventsClient: () => client
    });

    await store.getState().initialize();
    await store.getState().toggleRepo("/repo-b");

    repos = ["/repo-a", "/repo-b", "/repo-c"];
    await store.getState().initialize();

    expect(store.getState().repos).toEqual(repos);
    expect(store.getState().selectedRepos).toEqual(["/repo-a", "/repo-c"]);
    expect(selectVisibleBubbles(store.getState()).map((bubble) => bubble.bubbleId)).toEqual([
      "b-a",
      "b-c"
    ]);
    expect(client.start).toHaveBeenCalledTimes(1);
    expect(client.refresh).toHaveBeenCalledTimes(2);
  });

  it("adds and auto-expands newly created bubbles from realtime update events", async () => {
    const existingBubble = bubbleSummary({ bubbleId: "b-existing", repoPath: "/repo-a" });
    const createdBubble = bubbleSummary({ bubbleId: "b-created", repoPath: "/repo-a" });
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [existingBubble]
    }));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles
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

    emitEvent({
      id: 30,
      ts: "2026-02-24T12:30:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-created",
      bubble: createdBubble
    });

    expect(selectVisibleBubbles(store.getState()).map((bubble) => bubble.bubbleId)).toEqual([
      "b-created",
      "b-existing"
    ]);
    expect(store.getState().expandedBubbleIds).toEqual(["b-created"]);
    expect(getBubbles).toHaveBeenCalledTimes(1);
  });

  it("fills deterministic meta-review defaults when incoming payload misses metaReview", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: []
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

    const legacyBubble = bubbleSummary({
      bubbleId: "b-legacy-payload",
      repoPath: "/repo-a"
    });
    const legacyWithoutMetaReview = {
      ...legacyBubble
    } as unknown as Record<string, unknown>;
    delete legacyWithoutMetaReview.metaReview;

    emitEvent({
      id: 40,
      ts: "2026-02-24T12:40:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-legacy-payload",
      bubble: legacyWithoutMetaReview as unknown as typeof legacyBubble
    });

    expect(
      store.getState().bubblesById["b-legacy-payload"]?.metaReview
    ).toEqual({
      actor: "meta-reviewer",
      authorityActive: false,
      consecutiveCleanRuns: 0,
      runtimeDelivery: null
    });
  });

  it("falls back to zero when a legacy metaReview payload omits consecutiveCleanRuns", async () => {
    const malformedBubble = bubbleSummary({
      bubbleId: "b-missing-clean-streak",
      repoPath: "/repo-a"
    }) as unknown as Record<string, unknown>;
    malformedBubble.metaReview = {
      actor: "meta-reviewer",
      authorityActive: false,
      runtimeDelivery: null
    };
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [malformedBubble as unknown as ReturnType<typeof bubbleSummary>]
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

    expect(
      store.getState().bubblesById["b-missing-clean-streak"]?.metaReview
    ).toHaveProperty("consecutiveCleanRuns", 0);
  });

  it("normalizes meta-review runtime delivery correlation fields from incoming payloads", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-runtime-delivery",
            repoPath: "/repo-a",
            metaReview: {
              runtimeDelivery: {
                status: "uncertain",
                reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
                message: "delivery marker was not observed",
                observedAt: "2026-02-24T12:45:00.000Z",
                observedForHandoffId:
                  "meta_review:b-runtime-delivery:round:3:attempt:2",
                observedForRound: 3
              }
            }
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

    await store.getState().initialize();

    expect(
      store.getState().bubblesById["b-runtime-delivery"]?.metaReview.runtimeDelivery
    ).toEqual({
      status: "uncertain",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "delivery marker was not observed",
      observedAt: "2026-02-24T12:45:00.000Z",
      observedForHandoffId:
        "meta_review:b-runtime-delivery:round:3:attempt:2",
      observedForRound: 3
    });
  });

  it("drops empty blocked_prerequisites arrays from incoming reviewPolicy payloads", async () => {
    const guardedBubble = {
      ...bubbleSummary({
        bubbleId: "b-guarded",
        repoPath: "/repo-a"
      }),
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        reviewer_blocking_min_severity: "P1" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        meta_review_consecutive_clean_runs_required: 2,
        blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED",
        blocked_prerequisites: [],
        provenance_note: "Guarded until activation ownership lands."
      }
    };

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [guardedBubble]
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

    expect(store.getState().bubblesById["b-guarded"]?.reviewPolicy).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity: "P1",
      meta_review_auto_rework_min_severity: "P1",
      meta_review_consecutive_clean_runs_required: 2,
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED",
      provenance_note: "Guarded until activation ownership lands."
    });
  });

  it("rejects reviewPolicy payloads that omit consecutive clean-run requirement", async () => {
    const malformedPolicyBubble = {
      ...bubbleSummary({
        bubbleId: "b-missing-clean-requirement",
        repoPath: "/repo-a"
      }),
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        reviewer_blocking_min_severity: "P1" as const,
        meta_review_auto_rework_min_severity: "P1" as const
      }
    };
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [malformedPolicyBubble as unknown as ReturnType<typeof bubbleSummary>]
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

    expect(
      store.getState().bubblesById["b-missing-clean-requirement"]?.reviewPolicy
    ).toBeNull();
  });

  it("rejects reviewPolicy payloads that omit reviewer blocking severity", async () => {
    const malformedPolicyBubble = {
      ...bubbleSummary({
        bubbleId: "b-missing-reviewer-severity",
        repoPath: "/repo-a"
      }),
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        meta_review_consecutive_clean_runs_required: 1
      }
    };
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [malformedPolicyBubble as unknown as ReturnType<typeof bubbleSummary>]
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

    expect(
      store.getState().bubblesById["b-missing-reviewer-severity"]?.reviewPolicy
    ).toBeNull();
  });

  it("preserves unsupported quality pairs in store state without coercing them", async () => {
    const customPairBubble = {
      ...bubbleSummary({
        bubbleId: "b-custom-pair",
        repoPath: "/repo-a"
      }),
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        reviewer_blocking_min_severity: "P2" as const,
        meta_review_auto_rework_min_severity: "P2" as const,
        meta_review_consecutive_clean_runs_required: 2
      }
    };
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [customPairBubble]
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

    expect(store.getState().bubblesById["b-custom-pair"]?.reviewPolicy).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
      meta_review_consecutive_clean_runs_required: 2
    });
  });

  it("drops removed meta-review route fields from incoming realtime payloads", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: []
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

    emitEvent({
      id: 41,
      ts: "2026-02-24T12:42:30.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-route-payload",
      bubble: bubbleSummary({
        bubbleId: "b-route-payload",
        repoPath: "/repo-a",
        metaReview: {
          authorityActive: true
        }
      })
    });

    const metaReview = store.getState().bubblesById["b-route-payload"]?.metaReview;
    expect(metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: true,
      consecutiveCleanRuns: 0,
      runtimeDelivery: null
    });
    const metaReviewRecord = metaReview as unknown as Record<string, unknown>;
    expect(metaReviewRecord).not.toHaveProperty("latestRecommendation");
    expect(metaReviewRecord).not.toHaveProperty("latestStatus");
    expect(metaReviewRecord).not.toHaveProperty("latestSummary");
    expect(metaReviewRecord).not.toHaveProperty("latestReportRef");
    expect(metaReviewRecord).not.toHaveProperty("latestUpdatedAt");
    expect(metaReviewRecord).not.toHaveProperty("latestRoute");
    expect(metaReviewRecord).not.toHaveProperty("latestRouteReasonCode");
    expect(metaReviewRecord).not.toHaveProperty("latestRouteObservedAt");
  });

  it("positions a realtime-created bubble in the same row when right slot is available", async () => {
    const bubble1 = bubbleSummary({ bubbleId: "b-1", repoPath: "/repo-a" });
    const bubble2 = bubbleSummary({ bubbleId: "b-2", repoPath: "/repo-a" });
    const bubble3 = bubbleSummary({ bubbleId: "b-3", repoPath: "/repo-a" });
    const bubble4 = bubbleSummary({ bubbleId: "b-4", repoPath: "/repo-a" });
    const bubble5 = bubbleSummary({ bubbleId: "b-5", repoPath: "/repo-a" });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubble1, bubble2, bubble3, bubble4]
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
    await store.getState().toggleBubbleExpanded("b-1");

    emitEvent({
      id: 31,
      ts: "2026-02-24T12:31:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-5",
      bubble: bubble5
    });

    expect(store.getState().positions["b-5"]).toEqual(defaultPosition(6));
  });

  it("keeps default position when expanded bubbles do not block the new slot", async () => {
    const bubble1 = bubbleSummary({ bubbleId: "b-1", repoPath: "/repo-a" });
    const bubble2 = bubbleSummary({ bubbleId: "b-2", repoPath: "/repo-a" });
    const bubble3 = bubbleSummary({ bubbleId: "b-3", repoPath: "/repo-a" });
    const bubble4 = bubbleSummary({ bubbleId: "b-4", repoPath: "/repo-a" });
    const bubble5 = bubbleSummary({ bubbleId: "b-5", repoPath: "/repo-a" });
    const bubble6 = bubbleSummary({ bubbleId: "b-6", repoPath: "/repo-a" });
    const bubble7 = bubbleSummary({ bubbleId: "b-7", repoPath: "/repo-a" });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubble1, bubble2, bubble3, bubble4, bubble5, bubble6]
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
    await store.getState().toggleBubbleExpanded("b-1");

    emitEvent({
      id: 32,
      ts: "2026-02-24T12:32:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-7",
      bubble: bubble7
    });

    expect(store.getState().positions["b-7"]).toEqual(defaultPosition(6));
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

  it("ignores historical realtime events that arrive after a newer snapshot", async () => {
    const currentBubble = bubbleSummary({ bubbleId: "b-current", repoPath: "/repo-a" });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [currentBubble]
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

    emitEvent({
      id: 100,
      ts: "2026-02-24T13:00:00.000Z",
      type: "snapshot",
      repos: [repoSummary("/repo-a")],
      bubbles: [currentBubble]
    });

    const historicalBubble = {
      ...bubbleSummary({ bubbleId: "b-historical", repoPath: "/repo-a" }),
      state: "META_REVIEW_RUNNING"
    } as unknown as typeof currentBubble;

    emitEvent({
      id: 8,
      ts: "2026-02-24T12:00:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-historical",
      bubble: historicalBubble
    });

    expect(selectVisibleBubbles(store.getState()).map((bubble) => bubble.bubbleId)).toEqual([
      "b-current"
    ]);
    expect(store.getState().bubblesById["b-historical"]).toBeUndefined();
  });

  it("accepts low-id realtime events after a reconnect snapshot from a restarted server", async () => {
    const originalBubble = bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" });
    const restartedBubble = {
      ...originalBubble,
      state: "META_REVIEW_RUNNING"
    } as unknown as typeof originalBubble;

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [originalBubble]
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

    emitEvent({
      id: 100,
      ts: "2026-02-24T13:00:00.000Z",
      type: "snapshot",
      repos: [repoSummary("/repo-a")],
      bubbles: [originalBubble]
    });

    emitEvent({
      id: 0,
      ts: "2026-02-24T13:05:00.000Z",
      type: "snapshot",
      repos: [repoSummary("/repo-a")],
      bubbles: [originalBubble]
    });

    emitEvent({
      id: 1,
      ts: "2026-02-24T13:05:01.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: restartedBubble
    });

    expect(store.getState().bubblesById["b-a"]?.state).toBe("META_REVIEW_RUNNING");
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

  it("clears polling refresh error when SSE reconnects", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      }))
    });

    let emitStatus: (status: ConnectionStatus) => void = () => undefined;
    let emitPollingError: (error: unknown) => void = () => undefined;

    const store = createBubbleStore({
      api,
      createEventsClient: (input) => {
        emitStatus = input.onStatus;
        emitPollingError = input.onPollingError ?? (() => undefined);
        return {
          start: () => undefined,
          stop: () => undefined,
          refresh: () => undefined
        };
      }
    });

    await store.getState().initialize();

    emitPollingError(new Error("Load failed"));
    expect(store.getState().error).toBe("Polling refresh failed: Load failed");

    emitStatus("connected");
    expect(store.getState().error).toBeNull();
  });

  it("clears polling refresh error after a successful polling refresh", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      }))
    });

    let runPoll: (repos: string[]) => Promise<void> = async () => undefined;
    let emitPollingError: (error: unknown) => void = () => undefined;

    const store = createBubbleStore({
      api,
      createEventsClient: (input) => {
        runPoll = input.poll;
        emitPollingError = input.onPollingError ?? (() => undefined);
        return {
          start: () => undefined,
          stop: () => undefined,
          refresh: () => undefined
        };
      }
    });

    await store.getState().initialize();

    emitPollingError(new Error("Load failed"));
    expect(store.getState().error).toBe("Polling refresh failed: Load failed");

    await runPoll(["/repo-a"]);
    expect(store.getState().error).toBeNull();
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

  it("uses explicit review-policy conflict context for update-review-policy 409 recovery", async () => {
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      ]
    }));
    const updateReviewPolicy = vi.fn(async () => {
      throw new PairflowApiError({
        message: "review policy conflict",
        status: 409,
        code: "conflict",
        details: {
          reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
          currentState: "RUNNING",
          reviewPolicyConflict: {
            bubbleId: "b-a",
            repoPath: "/repo-a",
            currentState: "RUNNING",
            bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n",
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "unsupported",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1",
              meta_review_consecutive_clean_runs_required: 1,
              blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
            }
          }
        }
      });
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
      bubbleDetails: {
        "b-a": bubbleDetail({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      }
    });

    await expect(
      store.getState().runBubbleAction({
        bubbleId: "b-a",
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).rejects.toBeInstanceOf(PairflowApiError);

    expect(getBubbles).toHaveBeenCalledTimes(1);
    expect(store.getState().bubblesById["b-a"]?.reviewPolicy).toMatchObject({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded"
    });
    expect(store.getState().bubbleDetails["b-a"]?.bubbleToml).toBe(
      "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n"
    );
    expect(store.getState().actionRetryHintById["b-a"]).toContain(
      "conflict response"
    );
    expect(store.getState().actionRetryHintById["b-a"]).not.toContain("refetched");
  });

  it("uses degraded review-policy conflict context without requiring currentState", async () => {
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "WAITING_HUMAN"
        })
      ]
    }));
    const updateReviewPolicy = vi.fn(async () => {
      throw new PairflowApiError({
        message: "review policy conflict",
        status: 409,
        code: "conflict",
        details: {
          reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
          reviewPolicyConflict: {
            bubbleId: "b-a",
            repoPath: "/repo-a",
            currentState: null,
            bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n",
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "guarded",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1",
              meta_review_consecutive_clean_runs_required: 1,
              blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
            }
          }
        }
      });
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
      bubbleDetails: {
        "b-a": bubbleDetail({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "WAITING_HUMAN"
        })
      }
    });

    await expect(
      store.getState().runBubbleAction({
        bubbleId: "b-a",
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).rejects.toBeInstanceOf(PairflowApiError);

    expect(getBubbles).toHaveBeenCalledTimes(1);
    expect(store.getState().bubblesById["b-a"]?.state).toBe("WAITING_HUMAN");
    expect(store.getState().bubblesById["b-a"]?.reviewPolicy).toMatchObject({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded"
    });
    expect(store.getState().bubbleDetails["b-a"]?.state).toBe("WAITING_HUMAN");
    expect(store.getState().bubbleDetails["b-a"]?.bubbleToml).toBe(
      "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n"
    );
    expect(store.getState().actionRetryHintById["b-a"]).toContain(
      "conflict response"
    );
    expect(store.getState().actionRetryHintById["b-a"]).not.toContain("refetched");
  });

  it("normalizes the legacy unsupported support_status alias in 409 review-policy conflict payloads", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      ]
    }));
    const updateReviewPolicy = vi.fn(async () => {
      throw new PairflowApiError({
        message: "review policy conflict",
        status: 409,
        code: "conflict",
        details: {
          reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
          reviewPolicyConflict: {
            bubbleId: "b-a",
            repoPath: "/repo-a",
            currentState: "RUNNING",
            bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n",
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "unsupported",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1",
              meta_review_consecutive_clean_runs_required: 1
            }
          }
        }
      });
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).rejects.toBeInstanceOf(PairflowApiError);

    expect(getBubbles).toHaveBeenCalledTimes(1);
    expect(store.getState().bubblesById["b-a"]?.reviewPolicy).toMatchObject({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded"
    });
    expect(store.getState().actionRetryHintById["b-a"]).toContain(
      "conflict response"
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Normalizing non-canonical review-policy support_status 'unsupported' from a 409 conflict payload to canonical 'guarded'.",
      expect.objectContaining({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        source: "conflict_response"
      })
    );
    consoleWarnSpy.mockRestore();
  });

  it("treats a missing reviewer threshold in 409 review-policy conflict payloads as malformed", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      ]
    }));
    const updateReviewPolicy = vi.fn(async () => {
      throw new PairflowApiError({
        message: "review policy conflict",
        status: 409,
        code: "conflict",
        details: {
          reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
          reviewPolicyConflict: {
            bubbleId: "b-a",
            repoPath: "/repo-a",
            currentState: "RUNNING",
            bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n",
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "guarded",
              meta_review_auto_rework_min_severity: "P2",
              meta_review_consecutive_clean_runs_required: 1
            }
          }
        }
      });
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).rejects.toBeInstanceOf(PairflowApiError);

    expect(store.getState().bubblesById["b-a"]?.reviewPolicy).toMatchObject({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      reviewer_blocking_min_severity: "P3",
      meta_review_auto_rework_min_severity: "P3"
    });
    expect(store.getState().actionRetryHintById["b-a"]).toContain(
      "reviewPolicy payload was malformed"
    );
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      "Normalizing non-canonical review-policy support_status 'unsupported' from a 409 conflict payload to canonical 'guarded'.",
      expect.anything()
    );
    consoleWarnSpy.mockRestore();
  });

  it("warns but keeps direct conflict context when the 409 reviewPolicy payload is malformed", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const getBubbles = vi.fn().mockResolvedValue({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      ]
    });
    const updateReviewPolicy = vi.fn(async () => {
      throw new PairflowApiError({
        message: "review policy conflict",
        status: 409,
        code: "conflict",
        details: {
          reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
          reviewPolicyConflict: {
            bubbleId: "b-a",
            repoPath: "/repo-a",
            currentState: "RUNNING",
            bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n",
            reviewPolicy: {
              requested_loop_mode: "sidecar",
              effective_loop_mode: "full",
              support_status: "guarded",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1"
            }
          }
        }
      });
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
      bubbleDetails: {
        "b-a": bubbleDetail({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING",
          bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"full\"\n",
          reviewPolicy: {
            requested_loop_mode: "full",
            effective_loop_mode: "full",
            support_status: "enabled",
            reviewer_blocking_min_severity: "P1",
            meta_review_auto_rework_min_severity: "P1",
            meta_review_consecutive_clean_runs_required: 1
          }
        })
      }
    });

    await expect(
      store.getState().runBubbleAction({
        bubbleId: "b-a",
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).rejects.toBeInstanceOf(PairflowApiError);

    expect(getBubbles).toHaveBeenCalledTimes(1);
    expect(store.getState().bubbleDetails["b-a"]?.bubbleToml).toBe(
      "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n"
    );
    expect(store.getState().bubbleDetails["b-a"]?.reviewPolicy).toEqual({
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      reviewer_blocking_min_severity: "P1",
      meta_review_auto_rework_min_severity: "P1",
      meta_review_consecutive_clean_runs_required: 1
    });
    expect(store.getState().actionRetryHintById["b-a"]).toContain(
      "reviewPolicy payload was malformed"
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Ignoring review-policy conflict context because the 409 reviewPolicy payload is malformed.",
      expect.objectContaining({
        bubbleId: "b-a",
        repoPath: "/repo-a"
      })
    );
    consoleWarnSpy.mockRestore();
  });

  it("passes approve override fields through to API", async () => {
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
    }));
    const approveBubble = vi.fn(async () => ({}));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      approveBubble
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

    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "approve",
      refs: ["artifact://evidence/review.md"],
      overrideNonApprove: true,
      overrideReason: "Human override after manual validation."
    });

    expect(approveBubble).toHaveBeenCalledWith("/repo-a", "b-a", {
      refs: ["artifact://evidence/review.md"],
      overrideNonApprove: true,
      overrideReason: "Human override after manual validation."
    });
    expect(getBubbles).toHaveBeenCalledTimes(2);
  });

  it("routes restart action to api.restartBubble", async () => {
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      ]
    }));
    const restartBubble = vi.fn(async () => ({}));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      restartBubble
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
    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "restart"
    });

    expect(restartBubble).toHaveBeenCalledWith("/repo-a", "b-a");
  });

  it("passes review policy compare-and-swap fields through to API", async () => {
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      ]
    }));
    const updateReviewPolicy = vi.fn(async () => ({
      kind: "review_policy_updated" as const,
      bubbleId: "b-a",
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        reviewer_blocking_min_severity: "P1" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        meta_review_consecutive_clean_runs_required: 1
      },
      previousRequestedLoopMode: "full" as const,
      nextRequestedLoopMode: "meta_only" as const,
      activationChange: "none" as const,
      bubbleToml: "id = \"b-a\""
    }));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "update-review-policy",
      reviewLoopMode: "meta_only",
      expectedBubbleToml: "id = \"b-a\""
    });

    expect(updateReviewPolicy).toHaveBeenCalledWith("/repo-a", "b-a", {
      reviewLoopMode: "meta_only",
      expectedBubbleToml: "id = \"b-a\""
    });
  });

  it("applies update-review-policy success payload without depending on follow-up refetch", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            state: "RUNNING"
          })
        ]
      })
      .mockRejectedValue(new Error("refetch should not be required"));
    const updateReviewPolicy = vi.fn(async () => ({
      kind: "review_policy_updated" as const,
      bubbleId: "b-a",
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        reviewer_blocking_min_severity: "P1" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        meta_review_consecutive_clean_runs_required: 1,
        blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
      },
      previousRequestedLoopMode: "full" as const,
      nextRequestedLoopMode: "meta_only" as const,
      activationChange: "none" as const,
      bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n"
    }));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
      bubbleDetails: {
        "b-a": bubbleDetail({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      }
    });

    await expect(
      store.getState().runBubbleAction({
        bubbleId: "b-a",
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).resolves.toBeUndefined();

    expect(getBubbles).toHaveBeenCalledTimes(1);
    expect(store.getState().bubblesById["b-a"]?.reviewPolicy).toMatchObject({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity: "P1"
    });
    expect(store.getState().bubbleDetails["b-a"]?.bubbleToml).toBe(
      "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n"
    );
    expect(store.getState().actionErrorById["b-a"]).toBeUndefined();
    expect(store.getState().actionRetryHintById["b-a"]).toBeUndefined();
  });

  it("falls back to repo refresh when update-review-policy success payload cannot be normalized", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            state: "RUNNING"
          })
        ]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            state: "RUNNING",
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "guarded",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1",
              meta_review_consecutive_clean_runs_required: 1,
              blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
            }
          })
        ]
      });
    const updateReviewPolicy = vi.fn(
      async () =>
        ({
          kind: "review_policy_updated",
          bubbleId: "b-a",
          reviewPolicy: {
            requested_loop_mode: "meta_only",
            effective_loop_mode: "full",
            support_status: "unsupported",
            reviewer_blocking_min_severity: "P1",
            meta_review_auto_rework_min_severity: "P1"
          },
          previousRequestedLoopMode: "full",
          nextRequestedLoopMode: "meta_only",
          activationChange: "none",
          bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n"
        }) as unknown as Awaited<ReturnType<PairflowApiClient["updateReviewPolicy"]>>
    );

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).resolves.toBeUndefined();

    expect(getBubbles).toHaveBeenCalledTimes(2);
    expect(store.getState().bubblesById["b-a"]?.reviewPolicy).toMatchObject({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded"
    });
  });

  it("ignores incomplete conflict response bubble context and falls back to refresh", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            state: "RUNNING"
          })
        ]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [
          bubbleSummary({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            state: "RUNNING",
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "guarded",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1",
              meta_review_consecutive_clean_runs_required: 1,
              blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
            }
          })
        ]
      });
    const updateReviewPolicy = vi.fn(async () => {
      throw new PairflowApiError({
        message: "review policy conflict",
        status: 409,
        code: "conflict",
        details: {
          reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
          bubble: {
            bubbleId: "b-a",
            repoPath: "/repo-a",
            bubbleToml: "id = \"b-a\"\n"
          },
          currentState: "RUNNING"
        }
      });
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
        action: "update-review-policy",
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\""
      })
    ).rejects.toBeInstanceOf(PairflowApiError);

    expect(getBubbles).toHaveBeenCalledTimes(2);
    expect(store.getState().actionRetryHintById["b-a"]).toContain(
      "follow-up refresh completed"
    );
  });

  it("preserves newline-terminated review policy compare-and-swap tokens through the store", async () => {
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [
        bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        })
      ]
    }));
    const updateReviewPolicy = vi.fn(async () => ({
      kind: "review_policy_updated" as const,
      bubbleId: "b-a",
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        reviewer_blocking_min_severity: "P1" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        meta_review_consecutive_clean_runs_required: 1
      },
      previousRequestedLoopMode: "full" as const,
      nextRequestedLoopMode: "meta_only" as const,
      activationChange: "none" as const,
      bubbleToml: "id = \"b-a\"\n"
    }));
    const expectedBubbleToml = "id = \"b-a\"\nreview_loop_mode = \"full\"\n";

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      updateReviewPolicy
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
    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "update-review-policy",
      reviewLoopMode: "meta_only",
      expectedBubbleToml
    });

    expect(updateReviewPolicy).toHaveBeenCalledWith("/repo-a", "b-a", {
      reviewLoopMode: "meta_only",
      expectedBubbleToml
    });
  });

  it("returns confirmation artifacts for delete without force", async () => {
    const deleteResult: BubbleDeleteResult = {
      bubbleId: "b-a",
      deleted: false,
      requiresConfirmation: true,
      artifacts: {
        worktree: {
          exists: true,
          path: "/tmp/worktree-b-a"
        },
        tmux: {
          exists: true,
          sessionName: "pf-b-a"
        },
        runtimeSession: {
          exists: true,
          sessionName: "pf-b-a"
        },
        branch: {
          exists: true,
          name: "pairflow/bubble/b-a"
        }
      },
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false,
      removedWorktree: false,
      removedBubbleBranch: false
    };
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
    }));

    const deleteDeferred = createDeferred<BubbleDeleteResult>();
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      deleteBubble: vi.fn(async () => deleteDeferred.promise)
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
    const deletePromise = store.getState().deleteBubble("b-a");
    expect(store.getState().actionLoadingById["b-a"]).toBe(true);
    deleteDeferred.resolve(deleteResult);
    const result = await deletePromise;

    expect(result).toEqual(deleteResult);
    expect(store.getState().bubblesById["b-a"]).toBeDefined();
    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
    expect(api.deleteBubble).toHaveBeenCalledWith("/repo-a", "b-a", undefined);
    expect(getBubbles).toHaveBeenCalledTimes(1);
  });

  it("copies attach command when launcher resolves to copy", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      attachBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        tmuxSessionName: "pf-b-a",
        launcherRequested: "copy",
        launcherUsed: "copy",
        attachCommand: "tmux attach -t pf-b-a"
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
    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "attach"
    });

    expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
    expect(copyToClipboardMock).toHaveBeenCalledWith("tmux attach -t pf-b-a");
    expect(store.getState().actionErrorById["b-a"]).toBeUndefined();
  });

  it("copies remote ssh attach command when launcher resolves to copy", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      });

    const remoteAttachCommand =
      "'ssh' '-o' 'BatchMode=yes' '-t' 'dev@ssh.example.com' 'bash' '-lc' 'cd '\\''/srv/pairflow/repo--b-a'\\'' && tmux attach -t '\\''pf-remote-b-a'\\'''";
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      attachBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        tmuxSessionName: "pf-remote-b-a",
        launcherRequested: "copy",
        launcherUsed: "copy",
        attachCommand: remoteAttachCommand
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
    await store.getState().runBubbleAction({
      bubbleId: "b-a",
      action: "attach"
    });

    expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
    expect(copyToClipboardMock).toHaveBeenCalledWith(remoteAttachCommand);
    expect(store.getState().actionErrorById["b-a"]).toBeUndefined();
  });

  it("surfaces actionable error when attach copy-to-clipboard fails", async () => {
    copyToClipboardMock.mockRejectedValue(new Error("Clipboard permission denied"));

    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      attachBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        tmuxSessionName: "pf-b-a",
        launcherRequested: "copy",
        launcherUsed: "copy",
        attachCommand: "tmux attach -t pf-b-a"
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

    await expect(
      store.getState().runBubbleAction({
        bubbleId: "b-a",
        action: "attach"
      })
    ).rejects.toThrow(/Attach command copy failed/u);

    expect(store.getState().actionErrorById["b-a"]).toContain(
      "Run manually: tmux attach -t pf-b-a"
    );
  });

  it("refreshes repo and clears loading after successful delete", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: []
      });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      deleteBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: true,
            path: "/tmp/worktree-b-a"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b-a"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b-a"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: true,
        removedBubbleBranch: true
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
    const deletePromise = store.getState().deleteBubble("b-a");
    expect(store.getState().actionLoadingById["b-a"]).toBe(true);
    const result = await deletePromise;

    expect(result.deleted).toBe(true);
    expect(store.getState().bubblesById["b-a"]).toBeUndefined();
    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
    expect(api.deleteBubble).toHaveBeenCalledWith("/repo-a", "b-a", undefined);
    expect(getBubbles).toHaveBeenCalledTimes(2);
  });

  it("clears loading and records delete action errors", async () => {
    const deleteError = new Error("Delete failed");
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })),
      deleteBubble: vi.fn(async () => {
        throw deleteError;
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
    store.setState({
      actionErrorById: { "b-a": "Previous error" },
      actionRetryHintById: { "b-a": "Previous retry hint" },
      actionFailureById: { "b-a": "start" }
    });

    const deletePromise = store.getState().deleteBubble("b-a");

    expect(store.getState().actionLoadingById["b-a"]).toBe(true);
    expect(store.getState().actionErrorById["b-a"]).toBeUndefined();
    expect(store.getState().actionRetryHintById["b-a"]).toBeUndefined();
    expect(store.getState().actionFailureById["b-a"]).toBeUndefined();

    await expect(deletePromise).rejects.toThrow("Delete failed");

    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
    expect(store.getState().actionErrorById["b-a"]).toBe("Delete failed");
    expect(store.getState().actionRetryHintById["b-a"]).toBeUndefined();
    expect(store.getState().actionFailureById["b-a"]).toBe("delete");
  });

  it("records delete error metadata and clears loading for force delete failures", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })),
      deleteBubble: vi.fn(async () => {
        throw new Error("Force delete failed");
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

    await expect(store.getState().deleteBubble("b-a", true)).rejects.toThrow(
      "Force delete failed"
    );

    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
    expect(store.getState().actionErrorById["b-a"]).toBe("Force delete failed");
    expect(store.getState().actionFailureById["b-a"]).toBe("delete");
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

  it("uses single shared position for both collapsed and expanded cards", async () => {
    const storage = new MemoryStorage();
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

    await store.getState().initialize();

    // Set position while collapsed
    store.getState().setPosition("b-a", { x: 100, y: 200 });
    store.getState().persistPositions();

    // Expand the bubble
    await store.getState().toggleBubbleExpanded("b-a");

    // Position should be the same — single store, no separate expanded positions
    expect(store.getState().positions["b-a"]).toEqual({ x: 100, y: 200 });

    // Move while expanded — updates the same positions store
    store.getState().setPosition("b-a", { x: 300, y: 400 });

    // Collapse — position stays where we last moved it
    store.getState().collapseBubble("b-a");
    expect(store.getState().positions["b-a"]).toEqual({ x: 300, y: 400 });
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

  it("keeps expanded detail runtime state while realtime summary temporarily regresses", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a"
    });
    const healthyDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a"
    });
    const deferredDetail = createDeferred<typeof healthyDetail>();

    const getBubble = vi
      .fn<(repoPath: string, bubbleId: string) => Promise<typeof healthyDetail>>()
      .mockResolvedValueOnce(healthyDetail)
      .mockImplementationOnce(async () => deferredDetail.promise);

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [initialSummary]
      })),
      getBubble,
      getBubbleTimeline: vi.fn(async () => [])
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
    await store.getState().toggleBubbleExpanded("b-a");

    emitEvent({
      id: 200,
      ts: "2026-02-25T12:05:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: bubbleSummary({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        runtimeSession: null,
        stale: true
      })
    });

    expect(store.getState().bubblesById["b-a"]?.runtimeSession).toBeNull();
    expect(store.getState().bubbleDetails["b-a"]?.runtimeSession).toEqual(
      healthyDetail.runtimeSession
    );
    expect(store.getState().bubbleDetails["b-a"]?.runtime.stale).toBe(false);

    deferredDetail.resolve(healthyDetail);
    await Promise.resolve();
  });

  it("lets expanded detail recover when realtime summary becomes healthy again", async () => {
    const healthySummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a"
    });
    const staleDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      runtimeSession: null,
      stale: true
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [healthySummary]
      })),
      getBubble: vi.fn(async () => staleDetail),
      getBubbleTimeline: vi.fn(async () => [])
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
    await store.getState().toggleBubbleExpanded("b-a");

    expect(store.getState().bubbleDetails["b-a"]?.runtimeSession).toBeNull();
    expect(store.getState().bubbleDetails["b-a"]?.runtime.stale).toBe(true);

    emitEvent({
      id: 201,
      ts: "2026-02-25T12:06:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: healthySummary
    });

    expect(store.getState().bubbleDetails["b-a"]?.runtimeSession).toEqual(
      healthySummary.runtimeSession
    );
    expect(store.getState().bubbleDetails["b-a"]?.runtime.stale).toBe(false);
  });

  it("keeps expanded detail attention and remote diagnostics while realtime summary omits them", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "WAITING_HUMAN"
    });
    const diagnosticDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "WAITING_HUMAN",
      attention: {
        code: "watchdog_expired",
        severity: "warning",
        label: "Watchdog expired",
        detail: "The watchdog deadline passed without observed protocol activity."
      },
      remoteExecution: {
        alias: "spark1",
        host: "spark1",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "missing",
        reasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
        remoteClonePath: "/remote/repo",
        lastLiveCheckAt: "2026-04-19T11:30:00.000Z",
        lastCacheCheckAt: "2026-04-19T11:30:00.000Z"
      }
    });
    const deferredDetail = createDeferred<typeof diagnosticDetail>();

    const getBubble = vi
      .fn<(repoPath: string, bubbleId: string) => Promise<typeof diagnosticDetail>>()
      .mockResolvedValueOnce(diagnosticDetail)
      .mockImplementationOnce(async () => deferredDetail.promise);

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [initialSummary]
      })),
      getBubble,
      getBubbleTimeline: vi.fn(async () => [])
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
    await store.getState().toggleBubbleExpanded("b-a");

    emitEvent({
      id: 201,
      ts: "2026-04-19T11:31:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: bubbleSummary({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        state: "WAITING_HUMAN",
        attention: null
      })
    });

    expect(store.getState().bubbleDetails["b-a"]?.attention).toEqual(
      diagnosticDetail.attention
    );
    expect(store.getState().bubbleDetails["b-a"]?.remoteExecution).toEqual(
      diagnosticDetail.remoteExecution
    );

    deferredDetail.resolve(diagnosticDetail);
    await Promise.resolve();
  });

  it("clears stale local attention when realtime summary becomes healthy", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "RUNNING"
    });
    const staleDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "RUNNING",
      attention: {
        code: "quiet_pane",
        severity: "warning",
        label: "Quiet 10m",
        detail: "No pane activity was observed for 10 minutes."
      }
    });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [initialSummary]
      })),
      getBubble: vi.fn(async () => staleDetail),
      getBubbleTimeline: vi.fn(async () => [])
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
    await store.getState().toggleBubbleExpanded("b-a");

    emitEvent({
      id: 201,
      ts: "2026-04-19T16:41:05.570Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: bubbleSummary({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        state: "RUNNING",
        attention: null
      })
    });

    expect(store.getState().bubbleDetails["b-a"]?.attention).toBeNull();
  });

  it("keeps expanded detail remote status truth when realtime summary falls back to cache-only remote execution", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "RUNNING"
    });
    const activeRemoteDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "RUNNING",
      remoteExecution: {
        alias: "spark1",
        host: "spark1",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "active",
        remoteClonePath: "/remote/repo",
        lastLiveCheckAt: "2026-04-19T16:25:12.972Z",
        lastCacheCheckAt: "2026-04-19T16:25:12.972Z"
      }
    });
    const deferredDetail = createDeferred<typeof activeRemoteDetail>();

    const getBubble = vi
      .fn<(repoPath: string, bubbleId: string) => Promise<typeof activeRemoteDetail>>()
      .mockResolvedValueOnce(activeRemoteDetail)
      .mockImplementationOnce(async () => deferredDetail.promise);

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [initialSummary]
      })),
      getBubble,
      getBubbleTimeline: vi.fn(async () => [])
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
    await store.getState().toggleBubbleExpanded("b-a");

    emitEvent({
      id: 202,
      ts: "2026-04-19T16:25:38.482Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: bubbleSummary({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        state: "RUNNING",
        remoteExecution: {
          alias: "spark1",
          host: "spark1",
          pointerKind: "started",
          viewKind: "list",
          stateSource: "cache",
          cacheStatus: "present",
          remoteClonePath: "/remote/repo",
          lastCacheCheckAt: "2026-04-19T16:25:38.482Z"
        }
      })
    });

    expect(store.getState().bubbleDetails["b-a"]?.remoteExecution).toEqual(
      activeRemoteDetail.remoteExecution
    );

    deferredDetail.resolve(activeRemoteDetail);
    await Promise.resolve();
  });

  it("keeps expanded detail remote diagnostics when a later detail refresh omits them", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "WAITING_HUMAN"
    });
    const diagnosticDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "WAITING_HUMAN",
      attention: {
        code: "watchdog_expired",
        severity: "warning",
        label: "Watchdog expired",
        detail: "The watchdog deadline passed without observed protocol activity."
      },
      remoteExecution: {
        alias: "spark1",
        host: "spark1",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "missing",
        reasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
        remoteClonePath: "/remote/repo",
        lastLiveCheckAt: "2026-04-19T11:30:00.000Z",
        lastCacheCheckAt: "2026-04-19T11:30:00.000Z"
      }
    });
    const incompleteRefreshDetail = {
      ...diagnosticDetail
    };
    delete (incompleteRefreshDetail as { remoteExecution?: unknown }).remoteExecution;

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [initialSummary]
      })),
      getBubble: vi
        .fn<(repoPath: string, bubbleId: string) => Promise<typeof diagnosticDetail>>()
        .mockResolvedValueOnce(diagnosticDetail)
        .mockResolvedValueOnce(incompleteRefreshDetail as typeof diagnosticDetail),
      getBubbleTimeline: vi.fn(async () => [])
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
    await store.getState().refreshExpandedBubble("b-a");

    expect(store.getState().bubbleDetails["b-a"]?.remoteExecution).toEqual(
      diagnosticDetail.remoteExecution
    );
    expect(store.getState().bubblesById["b-a"]?.remoteExecution).toEqual(
      diagnosticDetail.remoteExecution
    );
  });

  it("records a detail error when expanded detail refresh fulfills without a body", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "RUNNING"
    });
    const getBubble = vi
      .fn<(repoPath: string, bubbleId: string) => Promise<UiBubbleDetail>>()
      .mockResolvedValueOnce(undefined as unknown as UiBubbleDetail);
    const getBubbleTimeline = vi.fn(async () => [
      timelineEntry({
        id: "msg_001",
        type: "TASK",
        sender: "orchestrator",
        recipient: "codex"
      })
    ]);
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [initialSummary]
      })),
      getBubble,
      getBubbleTimeline
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

    expect(store.getState().detailErrorById["b-a"]).toBe(
      "Bubble detail response was empty."
    );
    expect(store.getState().bubbleTimelines["b-a"]).toHaveLength(1);
  });

  it("clears expanded detail attention when a later detail refresh resolves it", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "WAITING_HUMAN"
    });
    const diagnosticDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "WAITING_HUMAN",
      attention: {
        code: "watchdog_expired",
        severity: "warning",
        label: "Watchdog expired",
        detail: "The watchdog deadline passed without observed protocol activity."
      }
    });
    const resolvedDetail = {
      ...diagnosticDetail,
      attention: null
    };

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [initialSummary]
      })),
      getBubble: vi
        .fn<(repoPath: string, bubbleId: string) => Promise<typeof diagnosticDetail>>()
        .mockResolvedValueOnce(diagnosticDetail)
        .mockResolvedValueOnce(resolvedDetail as typeof diagnosticDetail),
      getBubbleTimeline: vi.fn(async () => [])
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
    expect(store.getState().bubbleDetails["b-a"]?.attention).toEqual(
      diagnosticDetail.attention
    );

    await store.getState().refreshExpandedBubble("b-a");

    expect(store.getState().bubbleDetails["b-a"]?.attention).toBeNull();
    expect(store.getState().bubblesById["b-a"]?.attention).toBeNull();
  });
});

describe("deleteBubble store method", () => {
  it("calls refreshRepos when delete result is deleted=true", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: []
      });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      deleteBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: false,
            path: "/tmp/worktree-b-a"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b-a"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b-a"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: true,
        removedBubbleBranch: true
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

    const result = await store.getState().deleteBubble("b-a");

    expect(result.deleted).toBe(true);
    expect(api.deleteBubble).toHaveBeenCalledWith("/repo-a", "b-a", undefined);
    expect(getBubbles).toHaveBeenCalledTimes(2);
    expect(store.getState().bubblesById["b-a"]).toBeUndefined();
    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
  });

  it("treats refresh failure after successful delete as non-fatal", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })
      .mockRejectedValueOnce(new Error("Refresh failed"));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      deleteBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: false,
            path: "/tmp/worktree-b-a"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b-a"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b-a"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: true,
        removedBubbleBranch: true
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

    await expect(store.getState().deleteBubble("b-a")).resolves.toMatchObject({
      deleted: true
    });

    expect(api.deleteBubble).toHaveBeenCalledWith("/repo-a", "b-a", undefined);
    expect(getBubbles).toHaveBeenCalledTimes(2);
    expect(store.getState().actionErrorById["b-a"]).toBeUndefined();
    expect(store.getState().actionFailureById["b-a"]).toBeUndefined();
    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
  });

  it("does not call refreshRepos when delete requires confirmation", async () => {
    const getBubbles = vi.fn(async () => ({
      repo: repoSummary("/repo-a"),
      bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
    }));

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      deleteBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        deleted: false,
        requiresConfirmation: true,
        artifacts: {
          worktree: {
            exists: true,
            path: "/tmp/worktree-b-a"
          },
          tmux: {
            exists: true,
            sessionName: "pf-b-a"
          },
          runtimeSession: {
            exists: true,
            sessionName: "pf-b-a"
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b-a"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
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

    const result = await store.getState().deleteBubble("b-a");

    expect(result.requiresConfirmation).toBe(true);
    expect(result.deleted).toBe(false);
    expect(getBubbles).toHaveBeenCalledTimes(1);
    expect(store.getState().bubblesById["b-a"]).toBeDefined();
    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
  });

  it("records actionErrorById/actionFailureById on delete error", async () => {
    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles: vi.fn(async () => ({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })),
      deleteBubble: vi.fn(async () => {
        throw new Error("Delete failed");
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

    await expect(store.getState().deleteBubble("b-a")).rejects.toThrow("Delete failed");

    expect(store.getState().actionLoadingById["b-a"]).toBeUndefined();
    expect(store.getState().actionErrorById["b-a"]).toBe("Delete failed");
    expect(store.getState().actionFailureById["b-a"]).toBe("delete");
    expect(store.getState().actionRetryHintById["b-a"]).toBeUndefined();
  });

  it("uses repoPath override when bubble is removed before confirm delete", async () => {
    const getBubbles = vi
      .fn()
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
      })
      .mockResolvedValueOnce({
        repo: repoSummary("/repo-a"),
        bubbles: []
      });

    const api = createApiStub({
      getRepos: vi.fn(async () => ["/repo-a"]),
      getBubbles,
      deleteBubble: vi.fn(async () => ({
        bubbleId: "b-a",
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: false,
            path: "/tmp/worktree-b-a"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b-a"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b-a"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: true,
        removedBubbleBranch: true
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

    emitEvent({
      id: 100,
      ts: "2026-02-25T11:20:00.000Z",
      type: "bubble.removed",
      repoPath: "/repo-a",
      bubbleId: "b-a"
    });

    await expect(
      store.getState().deleteBubble("b-a", true, "/repo-a")
    ).resolves.toMatchObject({
      deleted: true
    });

    expect(api.deleteBubble).toHaveBeenCalledWith("/repo-a", "b-a", { force: true });
    expect(getBubbles).toHaveBeenCalledTimes(2);
  });

  it("ignores stale expanded refresh completions that resolve after a newer refresh", async () => {
    const initialSummary = bubbleSummary({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "RUNNING"
    });
    const initialDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "RUNNING"
    });
    const readyDetail = bubbleDetail({
      bubbleId: "b-a",
      repoPath: "/repo-a",
      state: "READY_FOR_HUMAN_APPROVAL"
    });
    const initialReviewerMetaDetail = {
      ...initialDetail,
      activeRole: "reviewer" as const,
      metaReview: {
        actor: "meta-reviewer" as const,
        authorityActive: true,
        consecutiveCleanRuns: 0,
        runtimeDelivery: null
      }
    };
    const readyForApprovalDetail = {
      ...readyDetail,
      activeAgent: null,
      activeRole: null,
      metaReview: {
        actor: "meta-reviewer" as const,
        authorityActive: false,
        consecutiveCleanRuns: 0,
        runtimeDelivery: null
      }
    };
    const staleDetailDeferred = createDeferred<typeof initialReviewerMetaDetail>();
    const staleTimelineDeferred = createDeferred<UiTimelineEntry[]>();
    const latestTimeline: UiTimelineEntry[] = [
      {
        id: "env-approval",
        ts: "2026-04-19T19:26:48.011Z",
        round: 2,
        type: "APPROVAL_REQUEST" as const,
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "Bubble is ready for approval."
        },
        refs: []
      }
    ];

    const getBubble = vi
      .fn<(repoPath: string, bubbleId: string) => Promise<UiBubbleDetail>>()
      .mockResolvedValueOnce(initialReviewerMetaDetail)
      .mockImplementationOnce(async () => staleDetailDeferred.promise)
      .mockResolvedValueOnce(readyForApprovalDetail);
    const getBubbleTimeline = vi
      .fn<(repoPath: string, bubbleId: string) => Promise<typeof latestTimeline>>()
      .mockResolvedValueOnce([])
      .mockImplementationOnce(async () => staleTimelineDeferred.promise)
      .mockResolvedValueOnce(latestTimeline);

    let emitEvent: (event: UiEvent) => void = () => undefined;
    const store = createBubbleStore({
      api: createApiStub({
        getRepos: vi.fn(async () => ["/repo-a"]),
        getBubbles: vi.fn(async () => ({
          repo: repoSummary("/repo-a"),
          bubbles: [initialSummary]
        })),
        getBubble,
        getBubbleTimeline
      }),
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
    await store.getState().toggleBubbleExpanded("b-a");

    emitEvent({
      id: 301,
      ts: "2026-04-19T19:26:10.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: bubbleSummary({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        state: "RUNNING",
        activeRole: "reviewer",
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: true,
          runtimeDelivery: null
        }
      })
    });

    emitEvent({
      id: 302,
      ts: "2026-04-19T19:26:48.011Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-a",
      bubble: bubbleSummary({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        activeAgent: null,
        activeRole: null,
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: false,
          runtimeDelivery: null
        }
      })
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().bubbleDetails["b-a"]?.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(store.getState().bubbleTimelines["b-a"]).toEqual(latestTimeline);

    staleDetailDeferred.resolve(initialReviewerMetaDetail);
    staleTimelineDeferred.resolve([
      {
        id: "env-pass",
        ts: "2026-04-19T19:20:59.424Z",
        round: 1,
        type: "PASS",
        sender: "codex",
        recipient: "claude",
        payload: {
          summary: "stale pass only"
        },
        refs: []
      }
    ]);
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().bubblesById["b-a"]?.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(store.getState().bubbleDetails["b-a"]?.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(store.getState().bubbleTimelines["b-a"]).toEqual(latestTimeline);
  });

  it("retries expanded timeline refresh when detail transcript total is ahead of the timeline response", async () => {
    vi.useFakeTimers();
    try {
      const initialSummary = bubbleSummary({
        bubbleId: "b-a",
        repoPath: "/repo-a",
        round: 1,
        activeAgent: "codex",
        activeRole: "implementer"
      });
      const initialDetail = {
        ...bubbleDetail({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        }),
        round: 1,
        activeAgent: "codex",
        activeRole: "implementer",
        transcript: {
          totalMessages: 1,
          lastMessageType: "TASK",
          lastMessageTs: "2026-04-19T20:46:40.952Z",
          lastMessageId: "msg_001"
        }
      } satisfies UiBubbleDetail;
      const laggingDetail = {
        ...bubbleDetail({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          state: "RUNNING"
        }),
        round: 1,
        activeAgent: "claude",
        activeRole: "reviewer",
        transcript: {
          totalMessages: 2,
          lastMessageType: "PASS",
          lastMessageTs: "2026-04-19T20:47:18.143Z",
          lastMessageId: "msg_002"
        }
      } satisfies UiBubbleDetail;
      const initialTimeline: UiTimelineEntry[] = [
        timelineEntry({
          id: "msg_001",
          round: 0,
          type: "TASK",
          sender: "orchestrator",
          recipient: "codex"
        })
      ];
      const recoveredTimeline: UiTimelineEntry[] = [
        ...initialTimeline,
        timelineEntry({
          id: "msg_002",
          round: 1,
          type: "PASS",
          sender: "codex",
          recipient: "claude"
        })
      ];

      const getBubble = vi
        .fn<(repoPath: string, bubbleId: string) => Promise<UiBubbleDetail>>()
        .mockResolvedValueOnce(initialDetail)
        .mockResolvedValueOnce(laggingDetail)
        .mockResolvedValueOnce(laggingDetail);
      const getBubbleTimeline = vi
        .fn<(repoPath: string, bubbleId: string) => Promise<UiTimelineEntry[]>>()
        .mockResolvedValueOnce(initialTimeline)
        .mockResolvedValueOnce(initialTimeline)
        .mockResolvedValueOnce(recoveredTimeline);

      let emitEvent: (event: UiEvent) => void = () => undefined;
      const store = createBubbleStore({
        api: createApiStub({
          getRepos: vi.fn(async () => ["/repo-a"]),
          getBubbles: vi.fn(async () => ({
            repo: repoSummary("/repo-a"),
            bubbles: [initialSummary]
          })),
          getBubble,
          getBubbleTimeline
        }),
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
      await store.getState().toggleBubbleExpanded("b-a");

      emitEvent({
        id: 401,
        ts: "2026-04-19T20:47:18.200Z",
        type: "bubble.updated",
        repoPath: "/repo-a",
        bubbleId: "b-a",
        bubble: bubbleSummary({
          bubbleId: "b-a",
          repoPath: "/repo-a",
          round: 1,
          activeAgent: "claude",
          activeRole: "reviewer"
        })
      });

      await Promise.resolve();
      await Promise.resolve();
      expect(store.getState().bubbleTimelines["b-a"]).toEqual(initialTimeline);

      await vi.advanceTimersByTimeAsync(200);
      await Promise.resolve();
      await Promise.resolve();

      expect(store.getState().bubbleTimelines["b-a"]).toEqual(recoveredTimeline);
      expect(getBubbleTimeline).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
