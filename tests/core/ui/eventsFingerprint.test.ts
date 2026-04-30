import { describe, expect, it } from "vitest";

import { bubbleFingerprint } from "../../../src/v11/infrastructure/ui/eventsFingerprint.js";
import type { BubbleListEntry } from "../../../src/v11/shared/list/listCommandContract.js";

function createRemoteBubbleEntry(overrides: Partial<BubbleListEntry["remoteExecution"]> = {}): BubbleListEntry {
  return {
    bubbleId: "remote-smoke20",
    repoPath: "/repo",
    worktreePath: "/repo/.pairflow-worktrees/remote-smoke20",
    state: "RUNNING",
    round: 1,
    activeAgent: "claude",
    activeRole: "reviewer",
    activeSince: "2026-04-19T20:34:56.846Z",
    lastCommandAt: "2026-04-19T20:34:56.846Z",
    stateValidation: null,
    runtimeSession: null,
    attention: null,
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: false,
      consecutiveCleanRuns: 0,
      runtimeDelivery: null
    },
    remoteExecution: {
      alias: "spark1",
      host: "spark1",
      pointerKind: "started",
      viewKind: "list",
      stateSource: "refresh",
      cacheStatus: "present",
      runtimeAvailability: "active",
      remoteClonePath: "/home/felho/repos/pairflow--remote-smoke20",
      lastLiveCheckAt: "2026-04-19T20:34:59.091Z",
      lastCacheCheckAt: "2026-04-19T20:34:59.091Z",
      refreshAttemptedAt: "2026-04-19T20:34:59.091Z",
      ...overrides
    }
  };
}

describe("bubbleFingerprint remote execution normalization", () => {
  it("ignores remote poll timestamps when computing bubble fingerprints", async () => {
    const earlier = createRemoteBubbleEntry();
    const later = createRemoteBubbleEntry({
      lastLiveCheckAt: "2026-04-19T20:35:09.091Z",
      lastCacheCheckAt: "2026-04-19T20:35:09.091Z",
      refreshAttemptedAt: "2026-04-19T20:35:09.091Z"
    });

    const earlierFingerprint = await bubbleFingerprint("/repo", earlier);
    const laterFingerprint = await bubbleFingerprint("/repo", later);

    expect(laterFingerprint).toBe(earlierFingerprint);
  });

  it("still changes when stable remote execution fields change", async () => {
    const active = createRemoteBubbleEntry({
      runtimeAvailability: "active"
    });
    const missing = createRemoteBubbleEntry({
      runtimeAvailability: "missing",
      runtimeReasonCode: "STATUS_REMOTE_RUNTIME_MISSING"
    });

    const activeFingerprint = await bubbleFingerprint("/repo", active);
    const missingFingerprint = await bubbleFingerprint("/repo", missing);

    expect(missingFingerprint).not.toBe(activeFingerprint);
  });

  it("changes when stable remote bubble handoff fields change even if poll timestamps do not", async () => {
    const implementer: BubbleListEntry = {
      ...createRemoteBubbleEntry({
        runtimeAvailability: "active"
      }),
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-04-19T20:34:40.000Z",
      lastCommandAt: "2026-04-19T20:34:40.000Z"
    };
    const reviewer: BubbleListEntry = {
      ...implementer,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-19T20:35:12.000Z",
      lastCommandAt: "2026-04-19T20:35:12.000Z"
    };

    const implementerFingerprint = await bubbleFingerprint("/repo", implementer);
    const reviewerFingerprint = await bubbleFingerprint("/repo", reviewer);

    expect(reviewerFingerprint).not.toBe(implementerFingerprint);
  });
});
