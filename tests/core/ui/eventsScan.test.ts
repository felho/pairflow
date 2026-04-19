import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { scanUiEventsRepo } from "../../../src/v11/infrastructure/ui/eventsScan.js";
import {
  presentBubbleSummaryFromListEntry,
  presentRepoSummary
} from "../../../src/v11/infrastructure/ui/presenters/bubblePresenter.js";
import type { RepoSnapshot } from "../../../src/v11/infrastructure/ui/eventsState.js";
import type { UiBubbleListView } from "../../../src/v11/shared/ports/uiRouter.js";
import type { BubbleListEntry } from "../../../src/v11/shared/list/listCommandContract.js";
import { normalizeRepoPath } from "../../../src/v11/infrastructure/executor/workspace/repoResolution.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-ui-events-scan-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
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

function createListView(repoPath: string, bubble: BubbleListEntry): UiBubbleListView {
  return {
    repoPath,
    total: 1,
    byState: {
      CREATED: 0,
      PREPARING_WORKSPACE: 0,
      RUNNING: 1,
      WAITING_HUMAN: 0,
      READY_FOR_HUMAN_APPROVAL: 0,
      APPROVED_FOR_COMMIT: 0,
      COMMITTED: 0,
      DONE: 0,
      FAILED: 0,
      CANCELLED: 0
    },
    runtimeSessions: {
      registered: 0,
      stale: 0
    },
    bubbles: [bubble],
    remoteExecutionSummary: {
      createdNotStarted: 0,
      unavailableStarted: 0
    }
  };
}

function createBubbleListEntry(input: {
  repoPath: string;
  worktreePath: string;
  bubbleId: string;
  round: number;
  stateSource: "cache" | "refresh";
}): BubbleListEntry {
  return {
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    worktreePath: input.worktreePath,
    state: "RUNNING",
    round: input.round,
    activeAgent: "codex",
    activeRole: "implementer",
    activeSince: "2026-04-19T20:00:00.000Z",
    lastCommandAt: "2026-04-19T20:00:00.000Z",
    stateValidation: null,
    runtimeSession: null,
    attention: null,
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: false,
      runtimeDelivery: null
    },
    remoteExecution: {
      alias: "spark1",
      host: "spark1",
      pointerKind: "started",
      viewKind: "list",
      stateSource: input.stateSource,
      cacheStatus: "present",
      remoteClonePath: `/home/felho/repos/pairflow--${input.bubbleId}`,
      runtimeAvailability: "active",
      lastLiveCheckAt: "2026-04-19T20:00:00.000Z"
    }
  };
}

describe("scanUiEventsRepo remote refresh routing", () => {
  it("uses refresh=true immediately when the previous snapshot already contains a started remote bubble", async () => {
    const repoPath = await createTempRepo();
    const normalizedRepoPath = await normalizeRepoPath(repoPath);
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_scan_01",
      repoPath,
      task: "Remote poll routing"
    });

    const entry = createBubbleListEntry({
      repoPath: normalizedRepoPath,
      worktreePath: bubble.paths.worktreePath,
      bubbleId: bubble.bubbleId,
      round: 1,
      stateSource: "refresh"
    });
    const view = createListView(normalizedRepoPath, entry);
    const snapshots = new Map([
      [
        normalizedRepoPath,
        {
          repo: presentRepoSummary(view),
          bubbles: new Map([
            [
              bubble.bubbleId,
              {
                summary: presentBubbleSummaryFromListEntry(entry),
                fingerprint: "previous"
              }
            ]
          ])
        }
      ]
    ]);
    const listBubblesMock = vi.fn(async () => view);

    await scanUiEventsRepo({
      repoPath: normalizedRepoPath,
      emitEvents: false,
      snapshots,
      nextBubbleUpdatedEvent: () => ({}) as never,
      nextBubbleRemovedEvent: () => ({}) as never,
      listBubbles: listBubblesMock
    });

    expect(listBubblesMock).toHaveBeenCalledTimes(1);
    expect(listBubblesMock).toHaveBeenCalledWith({
      repoPath: normalizedRepoPath,
      refresh: true
    });
  });

  it("refetches with refresh=true when a started remote bubble is discovered during an unrefreshed scan", async () => {
    const repoPath = await createTempRepo();
    const normalizedRepoPath = await normalizeRepoPath(repoPath);
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_scan_02",
      repoPath,
      task: "Remote discovery refresh"
    });

    const cachedEntry = createBubbleListEntry({
      repoPath: normalizedRepoPath,
      worktreePath: bubble.paths.worktreePath,
      bubbleId: bubble.bubbleId,
      round: 1,
      stateSource: "cache"
    });
    const refreshedEntry = createBubbleListEntry({
      repoPath: normalizedRepoPath,
      worktreePath: bubble.paths.worktreePath,
      bubbleId: bubble.bubbleId,
      round: 2,
      stateSource: "refresh"
    });
    const listBubblesMock = vi
      .fn()
      .mockResolvedValueOnce(createListView(normalizedRepoPath, cachedEntry))
      .mockResolvedValueOnce(createListView(normalizedRepoPath, refreshedEntry));
    const snapshots = new Map<string, RepoSnapshot>();

    const result = await scanUiEventsRepo({
      repoPath: normalizedRepoPath,
      emitEvents: false,
      snapshots,
      nextBubbleUpdatedEvent: () => ({}) as never,
      nextBubbleRemovedEvent: () => ({}) as never,
      listBubbles: listBubblesMock
    });

    expect(listBubblesMock).toHaveBeenCalledTimes(2);
    expect(listBubblesMock.mock.calls[0]?.[0]).toEqual({
      repoPath: normalizedRepoPath
    });
    expect(listBubblesMock.mock.calls[1]?.[0]).toEqual({
      repoPath: normalizedRepoPath,
      refresh: true
    });
    expect(result.snapshot.bubbles.get(bubble.bubbleId)?.summary.round).toBe(2);
    expect(
      result.snapshot.bubbles.get(bubble.bubbleId)?.summary.remoteExecution?.viewKind
    ).toBe("list");
  });

  it("emits a changed event when a started remote bubble handoff updates active role without changing state or round", async () => {
    const repoPath = await createTempRepo();
    const normalizedRepoPath = await normalizeRepoPath(repoPath);
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b_ui_events_scan_03",
      repoPath,
      task: "Remote handoff fingerprint"
    });

    const implementerEntry = createBubbleListEntry({
      repoPath: normalizedRepoPath,
      worktreePath: bubble.paths.worktreePath,
      bubbleId: bubble.bubbleId,
      round: 1,
      stateSource: "refresh"
    });
    const reviewerEntry: BubbleListEntry = {
      ...implementerEntry,
      activeAgent: "claude",
      activeRole: "reviewer",
      activeSince: "2026-04-19T20:00:30.000Z",
      lastCommandAt: "2026-04-19T20:00:30.000Z"
    };

    const initialView = createListView(normalizedRepoPath, implementerEntry);
    const snapshots = new Map<string, RepoSnapshot>([
      [
        normalizedRepoPath,
        {
          repo: presentRepoSummary(initialView),
          bubbles: new Map([
            [
              bubble.bubbleId,
              {
                summary: presentBubbleSummaryFromListEntry(implementerEntry),
                fingerprint: await (await import("../../../src/v11/infrastructure/ui/eventsFingerprint.js")).bubbleFingerprint(
                  normalizedRepoPath,
                  implementerEntry
                )
              }
            ]
          ])
        }
      ]
    ]);

    const result = await scanUiEventsRepo({
      repoPath: normalizedRepoPath,
      emitEvents: true,
      snapshots,
      nextBubbleUpdatedEvent: (repo, updatedBubble) => ({
        id: 1,
        ts: "2026-04-19T20:00:30.000Z",
        type: "bubble.updated",
        repoPath: repo,
        bubbleId: updatedBubble.bubbleId,
        bubble: updatedBubble
      }),
      nextBubbleRemovedEvent: () => ({}) as never,
      listBubbles: vi.fn(async () => createListView(normalizedRepoPath, reviewerEntry))
    });

    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]?.type).toBe("bubble.updated");
    expect(result.changed[0]?.bubble.activeRole).toBe("reviewer");
  });
});
