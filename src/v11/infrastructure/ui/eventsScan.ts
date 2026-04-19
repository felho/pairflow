import { watch, type FSWatcher } from "node:fs";
import { join } from "node:path";

import { getBubblePaths } from "../artifact/bubble/paths.js";
import { pathExists } from "../foundation/fs/pathExists.js";
import { getWatchdogPaneActivityPath } from "../artifact/watchdog/watchdogPaneActivityStore.js";
import type { UiEvent, UiRepoUpdatedEvent } from "../../../types/ui.js";
import { presentBubbleSummaryFromListEntry, presentRepoSummary } from "./presenters/bubblePresenter.js";
import type { BubbleFingerprintSnapshot, RepoDiff, RepoSnapshot } from "./eventsState.js";
import { bubbleFingerprint, listBubbleIds, sameRepoSummary } from "./eventsFingerprint.js";
import { listBubbles } from "./eventsScanDefaults.js";
import type { UiBubbleListView as BubbleListView } from "../../shared/ports/uiRouter.js";

function repoSnapshotHasStartedRemoteBubble(snapshot: RepoSnapshot | undefined): boolean {
  if (snapshot === undefined) {
    return false;
  }
  for (const bubble of snapshot.bubbles.values()) {
    if (bubble.summary.remoteExecution?.pointerKind === "started") {
      return true;
    }
  }
  return false;
}

function viewHasStartedRemoteBubble(view: BubbleListView): boolean {
  return view.bubbles.some((bubble) => bubble.remoteExecution?.pointerKind === "started");
}

export async function scanUiEventsRepo(input: {
  repoPath: string;
  emitEvents: boolean;
  snapshots: Map<string, RepoSnapshot>;
  nextBubbleUpdatedEvent: (repoPath: string, bubble: ReturnType<typeof presentBubbleSummaryFromListEntry>) => RepoDiff["changed"][number];
  nextBubbleRemovedEvent: (repoPath: string, bubbleId: string) => RepoDiff["removed"][number];
  listBubbles?: typeof listBubbles;
}): Promise<RepoDiff> {
  const previous = input.snapshots.get(input.repoPath);
  const listBubblesFn = input.listBubbles ?? listBubbles;
  let view = await listBubblesFn({
    repoPath: input.repoPath,
    ...(repoSnapshotHasStartedRemoteBubble(previous) ? { refresh: true } : {})
  });
  if (
    !repoSnapshotHasStartedRemoteBubble(previous)
    && viewHasStartedRemoteBubble(view)
  ) {
    view = await listBubblesFn({
      repoPath: input.repoPath,
      refresh: true
    });
  }
  const repoSummary = presentRepoSummary(view);

  const nextBubbles = new Map<string, BubbleFingerprintSnapshot>();
  const changed: RepoDiff["changed"] = [];
  const removed: RepoDiff["removed"] = [];

  for (const bubble of view.bubbles) {
    const summary = presentBubbleSummaryFromListEntry(bubble);
    const fingerprint = await bubbleFingerprint(input.repoPath, bubble);
    nextBubbles.set(summary.bubbleId, {
      summary,
      fingerprint
    });

    if (!input.emitEvents) {
      continue;
    }
    const previousBubble = previous?.bubbles.get(summary.bubbleId);
    if (
      previousBubble === undefined ||
      previousBubble.fingerprint !== fingerprint
    ) {
      changed.push(input.nextBubbleUpdatedEvent(input.repoPath, summary));
    }
  }

  if (input.emitEvents && previous !== undefined) {
    for (const bubbleId of previous.bubbles.keys()) {
      if (nextBubbles.has(bubbleId)) {
        continue;
      }
      removed.push(input.nextBubbleRemovedEvent(input.repoPath, bubbleId));
    }
  }

  const repoChanged = previous === undefined ? false : !sameRepoSummary(previous.repo, repoSummary);
  const snapshot: RepoSnapshot = {
    repo: repoSummary,
    bubbles: nextBubbles
  };
  input.snapshots.set(input.repoPath, snapshot);

  return {
    repoPath: input.repoPath,
    repo: repoSummary,
    changed,
    removed,
    repoChanged,
    snapshot
  };
}

export async function refreshUiEventsWatchers(input: {
  repos: string[];
  watchers: Map<string, FSWatcher>;
  scheduleScan: () => void;
}): Promise<void> {
  const targets = new Set<string>();

  for (const repoPath of input.repos) {
    targets.add(join(repoPath, ".pairflow"));
    targets.add(join(repoPath, ".pairflow", "bubbles"));
    targets.add(join(repoPath, ".pairflow", "runtime"));
    targets.add(join(repoPath, ".pairflow", "runtime", "sessions.json"));
    targets.add(join(repoPath, ".pairflow", "runtime", "watchdog-health"));

    const bubbleIds = await listBubbleIds(repoPath);
    for (const bubbleId of bubbleIds) {
      const paths = getBubblePaths(repoPath, bubbleId);
      targets.add(paths.bubbleDir);
      targets.add(paths.statePath);
      targets.add(paths.inboxPath);
      targets.add(paths.transcriptPath);
      targets.add(getWatchdogPaneActivityPath(paths.runtimeDir, bubbleId));
    }
  }

  for (const [path, watcher] of input.watchers.entries()) {
    if (targets.has(path)) {
      continue;
    }
    watcher.close();
    input.watchers.delete(path);
  }

  for (const target of targets) {
    if (input.watchers.has(target)) {
      continue;
    }
    if (!(await pathExists(target))) {
      continue;
    }
    const watcher = watch(target, () => {
      input.scheduleScan();
    });
    watcher.on("error", () => {
      watcher.close();
      input.watchers.delete(target);
    });
    input.watchers.set(target, watcher);
  }
}

export async function scanUiEventsAll(input: {
  repos: string[];
  emitEvents: boolean;
  snapshots: Map<string, RepoSnapshot>;
  nextBubbleUpdatedEvent: (repoPath: string, bubble: ReturnType<typeof presentBubbleSummaryFromListEntry>) => RepoDiff["changed"][number];
  nextBubbleRemovedEvent: (repoPath: string, bubbleId: string) => RepoDiff["removed"][number];
  nextRepoEvent: (repoPath: string, repo: RepoDiff["repo"]) => UiRepoUpdatedEvent;
  refreshWatchers: () => Promise<void>;
  notify: (event: UiEvent) => void;
  listBubbles?: typeof listBubbles;
}): Promise<void> {
  const diffs: RepoDiff[] = [];
  for (const repoPath of input.repos) {
    diffs.push(
      await scanUiEventsRepo({
        repoPath,
        emitEvents: input.emitEvents,
        snapshots: input.snapshots,
        nextBubbleUpdatedEvent: input.nextBubbleUpdatedEvent,
        nextBubbleRemovedEvent: input.nextBubbleRemovedEvent,
        ...(input.listBubbles !== undefined ? { listBubbles: input.listBubbles } : {})
      })
    );
  }

  await input.refreshWatchers();
  if (!input.emitEvents) {
    return;
  }

  for (const diff of diffs) {
    for (const event of diff.changed) {
      input.notify(event);
    }
    for (const event of diff.removed) {
      input.notify(event);
    }
    if (diff.repoChanged) {
      input.notify(input.nextRepoEvent(diff.repoPath, diff.repo));
    }
  }
}
