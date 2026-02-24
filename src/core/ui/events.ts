import { constants as fsConstants, watch, type FSWatcher } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { getBubblePaths } from "../bubble/paths.js";
import {
  listBubbles,
  type BubbleListEntry,
  type BubbleListView
} from "../bubble/listBubbles.js";
import type {
  UiBubbleRemovedEvent,
  UiBubbleSummary,
  UiBubbleUpdatedEvent,
  UiEvent,
  UiRepoSummary,
  UiRepoUpdatedEvent,
  UiSnapshotEvent
} from "../../types/ui.js";
import {
  presentBubbleSummaryFromListEntry,
  presentRepoSummary
} from "./presenters/bubblePresenter.js";

interface BubbleFingerprintSnapshot {
  summary: UiBubbleSummary;
  fingerprint: string;
}

interface RepoSnapshot {
  repo: UiRepoSummary;
  bubbles: Map<string, BubbleFingerprintSnapshot>;
}

interface UiEventFilter {
  repos?: Set<string> | undefined;
  bubbleId?: string | undefined;
}

export interface UiEventsSubscriptionInput {
  repos?: string[] | undefined;
  bubbleId?: string | undefined;
  lastEventId?: number | undefined;
}

interface UiEventsListener {
  id: number;
  filter: UiEventFilter;
  callback: (event: UiEvent) => void;
}

export interface UiEventsBrokerOptions {
  repos: string[];
  pollIntervalMs?: number | undefined;
  debounceMs?: number | undefined;
  historyLimit?: number | undefined;
}

export interface UiEventsBroker {
  subscribe(
    input: UiEventsSubscriptionInput,
    callback: (event: UiEvent) => void
  ): () => void;
  getSnapshot(input?: UiEventsSubscriptionInput): UiSnapshotEvent;
  close(): Promise<void>;
}

interface RepoDiff {
  repoPath: string;
  repo: UiRepoSummary;
  changed: UiBubbleUpdatedEvent[];
  removed: UiBubbleRemovedEvent[];
  repoChanged: boolean;
  snapshot: RepoSnapshot;
}

const defaultPollIntervalMs = 2_000;
const defaultDebounceMs = 150;
const defaultHistoryLimit = 512;

async function pathExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch(() => false);
}

async function listBubbleIds(repoPath: string): Promise<string[]> {
  const bubblesDir = join(repoPath, ".pairflow", "bubbles");
  const entries = await readdir(bubblesDir, {
    withFileTypes: true
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function fileFingerprint(path: string): Promise<string> {
  const info = await stat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (info === undefined) {
    return "missing";
  }
  return `${info.mtimeMs}:${info.size}`;
}

async function bubbleFingerprint(
  repoPath: string,
  entry: BubbleListEntry
): Promise<string> {
  const paths = getBubblePaths(repoPath, entry.bubbleId);
  const [stateSig, inboxSig, transcriptSig] = await Promise.all([
    fileFingerprint(paths.statePath),
    fileFingerprint(paths.inboxPath),
    fileFingerprint(paths.transcriptPath)
  ]);

  const runtimeSig =
    entry.runtimeSession === null
      ? "none"
      : [
          entry.runtimeSession.updatedAt,
          entry.runtimeSession.tmuxSessionName
        ].join(":");

  return [
    stateSig,
    inboxSig,
    transcriptSig,
    runtimeSig,
    entry.state,
    String(entry.round)
  ].join("|");
}

function sameRepoSummary(left: UiRepoSummary, right: UiRepoSummary): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createFilter(input: UiEventsSubscriptionInput = {}): UiEventFilter {
  return {
    ...(input.repos !== undefined ? { repos: new Set(input.repos) } : {}),
    ...(input.bubbleId !== undefined ? { bubbleId: input.bubbleId } : {})
  };
}

function eventMatchesFilter(event: UiEvent, filter: UiEventFilter): boolean {
  if (event.type === "snapshot") {
    if (
      filter.repos !== undefined &&
      !event.repos.some((repo) => filter.repos?.has(repo.repoPath) ?? false)
    ) {
      return false;
    }
    if (
      filter.bubbleId !== undefined &&
      !event.bubbles.some((bubble) => bubble.bubbleId === filter.bubbleId)
    ) {
      return false;
    }
    return true;
  }

  if (filter.repos !== undefined && !filter.repos.has(event.repoPath)) {
    return false;
  }

  if (filter.bubbleId !== undefined) {
    if (event.type === "bubble.updated" || event.type === "bubble.removed") {
      return event.bubbleId === filter.bubbleId;
    }
    return false;
  }

  return true;
}

class UiEventsBrokerImpl implements UiEventsBroker {
  private readonly pollIntervalMs: number;
  private readonly debounceMs: number;
  private readonly historyLimit: number;
  private readonly repos: string[];
  private readonly snapshots = new Map<string, RepoSnapshot>();
  private readonly listeners = new Map<number, UiEventsListener>();
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly history: UiEvent[] = [];
  private nextListenerId = 1;
  private nextEventId = 1;
  private pollTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private scanInFlight = false;
  private scanQueued = false;
  private closed = false;
  private readonly closeWaiters: Array<() => void> = [];

  public constructor(input: UiEventsBrokerOptions) {
    this.repos = [...new Set(input.repos)].sort((left, right) =>
      left.localeCompare(right)
    );
    this.pollIntervalMs = input.pollIntervalMs ?? defaultPollIntervalMs;
    this.debounceMs = input.debounceMs ?? defaultDebounceMs;
    this.historyLimit = input.historyLimit ?? defaultHistoryLimit;
  }

  public async start(): Promise<void> {
    await this.scanAll(false);
    this.pollTimer = setInterval(() => {
      this.scheduleScan();
    }, this.pollIntervalMs);
  }

  public subscribe(
    input: UiEventsSubscriptionInput,
    callback: (event: UiEvent) => void
  ): () => void {
    const id = this.nextListenerId;
    this.nextListenerId += 1;

    const filter = createFilter(input);
    const listener: UiEventsListener = {
      id,
      filter,
      callback
    };
    this.listeners.set(id, listener);

    const lastEventId = input.lastEventId ?? 0;
    for (const event of this.history) {
      if (event.id <= lastEventId) {
        continue;
      }
      if (!eventMatchesFilter(event, filter)) {
        continue;
      }
      callback(event);
    }

    return () => {
      this.listeners.delete(id);
    };
  }

  public getSnapshot(input: UiEventsSubscriptionInput = {}): UiSnapshotEvent {
    const filter = createFilter(input);
    const repos: UiRepoSummary[] = [];
    const bubbles: UiBubbleSummary[] = [];

    for (const snapshot of this.snapshots.values()) {
      if (
        filter.repos !== undefined &&
        !filter.repos.has(snapshot.repo.repoPath)
      ) {
        continue;
      }
      repos.push(snapshot.repo);

      for (const entry of snapshot.bubbles.values()) {
        if (
          filter.bubbleId !== undefined &&
          entry.summary.bubbleId !== filter.bubbleId
        ) {
          continue;
        }
        bubbles.push(entry.summary);
      }
    }

    repos.sort((left, right) => left.repoPath.localeCompare(right.repoPath));
    bubbles.sort((left, right) => {
      const byRepo = left.repoPath.localeCompare(right.repoPath);
      if (byRepo !== 0) {
        return byRepo;
      }
      return left.bubbleId.localeCompare(right.bubbleId);
    });

    const id = Math.max(0, this.nextEventId - 1);
    const ts = new Date().toISOString();
    return {
      id,
      ts,
      type: "snapshot",
      repos,
      bubbles
    };
  }

  public async close(): Promise<void> {
    this.closed = true;
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    this.listeners.clear();
    if (this.scanInFlight) {
      await new Promise<void>((resolve) => {
        this.closeWaiters.push(resolve);
      });
    }
  }

  private notify(event: UiEvent): void {
    this.history.push(event);
    if (this.history.length > this.historyLimit) {
      this.history.splice(0, this.history.length - this.historyLimit);
    }

    for (const listener of this.listeners.values()) {
      if (!eventMatchesFilter(event, listener.filter)) {
        continue;
      }
      listener.callback(event);
    }
  }

  private scheduleScan(): void {
    if (this.closed) {
      return;
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.scanAll(true);
    }, this.debounceMs);
  }

  private async scanAll(emitEvents: boolean): Promise<void> {
    if (this.closed) {
      return;
    }
    if (this.scanInFlight) {
      this.scanQueued = true;
      return;
    }

    this.scanInFlight = true;
    try {
      const diffs: RepoDiff[] = [];
      for (const repoPath of this.repos) {
        diffs.push(await this.scanRepo(repoPath, emitEvents));
      }

      await this.refreshWatchers();
      if (emitEvents) {
        for (const diff of diffs) {
          for (const event of diff.changed) {
            this.notify(event);
          }
          for (const event of diff.removed) {
            this.notify(event);
          }
          if (diff.repoChanged) {
            this.notify(this.nextRepoEvent(diff.repoPath, diff.repo));
          }
        }
      }
    } finally {
      this.scanInFlight = false;
      while (this.closeWaiters.length > 0) {
        const waiter = this.closeWaiters.shift();
        waiter?.();
      }
      if (this.scanQueued) {
        this.scanQueued = false;
        void this.scanAll(true);
      }
    }
  }

  private nextBubbleUpdatedEvent(
    repoPath: string,
    bubble: UiBubbleSummary
  ): UiBubbleUpdatedEvent {
    const id = this.nextEventId;
    this.nextEventId += 1;
    return {
      id,
      ts: new Date().toISOString(),
      type: "bubble.updated",
      repoPath,
      bubbleId: bubble.bubbleId,
      bubble
    };
  }

  private nextBubbleRemovedEvent(
    repoPath: string,
    bubbleId: string
  ): UiBubbleRemovedEvent {
    const id = this.nextEventId;
    this.nextEventId += 1;
    return {
      id,
      ts: new Date().toISOString(),
      type: "bubble.removed",
      repoPath,
      bubbleId
    };
  }

  private nextRepoEvent(repoPath: string, repo: UiRepoSummary): UiRepoUpdatedEvent {
    const id = this.nextEventId;
    this.nextEventId += 1;
    return {
      id,
      ts: new Date().toISOString(),
      type: "repo.updated",
      repoPath,
      repo
    };
  }

  private async scanRepo(repoPath: string, emitEvents: boolean): Promise<RepoDiff> {
    const view: BubbleListView = await listBubbles({
      repoPath
    });
    const previous = this.snapshots.get(repoPath);
    const repoSummary = presentRepoSummary(view);

    const nextBubbles = new Map<string, BubbleFingerprintSnapshot>();
    const changed: UiBubbleUpdatedEvent[] = [];
    const removed: UiBubbleRemovedEvent[] = [];

    for (const bubble of view.bubbles) {
      const summary = presentBubbleSummaryFromListEntry(bubble);
      const fingerprint = await bubbleFingerprint(repoPath, bubble);
      nextBubbles.set(summary.bubbleId, {
        summary,
        fingerprint
      });

      if (!emitEvents || previous === undefined) {
        continue;
      }
      const previousBubble = previous.bubbles.get(summary.bubbleId);
      if (
        previousBubble === undefined ||
        previousBubble.fingerprint !== fingerprint
      ) {
        changed.push(this.nextBubbleUpdatedEvent(repoPath, summary));
      }
    }

    if (emitEvents && previous !== undefined) {
      for (const bubbleId of previous.bubbles.keys()) {
        if (nextBubbles.has(bubbleId)) {
          continue;
        }
        removed.push(this.nextBubbleRemovedEvent(repoPath, bubbleId));
      }
    }

    const repoChanged =
      previous === undefined ? false : !sameRepoSummary(previous.repo, repoSummary);
    const snapshot: RepoSnapshot = {
      repo: repoSummary,
      bubbles: nextBubbles
    };
    this.snapshots.set(repoPath, snapshot);

    return {
      repoPath,
      repo: repoSummary,
      changed,
      removed,
      repoChanged,
      snapshot
    };
  }

  private async refreshWatchers(): Promise<void> {
    const targets = new Set<string>();

    for (const repoPath of this.repos) {
      targets.add(join(repoPath, ".pairflow"));
      targets.add(join(repoPath, ".pairflow", "bubbles"));
      targets.add(join(repoPath, ".pairflow", "runtime"));
      targets.add(join(repoPath, ".pairflow", "runtime", "sessions.json"));

      const bubbleIds = await listBubbleIds(repoPath);
      for (const bubbleId of bubbleIds) {
        const paths = getBubblePaths(repoPath, bubbleId);
        targets.add(paths.bubbleDir);
        targets.add(paths.statePath);
        targets.add(paths.inboxPath);
        targets.add(paths.transcriptPath);
      }
    }

    for (const [path, watcher] of this.watchers.entries()) {
      if (targets.has(path)) {
        continue;
      }
      watcher.close();
      this.watchers.delete(path);
    }

    for (const target of targets) {
      if (this.watchers.has(target)) {
        continue;
      }
      if (!(await pathExists(target))) {
        continue;
      }
      const watcher = watch(target, () => {
        this.scheduleScan();
      });
      watcher.on("error", () => {
        watcher.close();
        this.watchers.delete(target);
      });
      this.watchers.set(target, watcher);
    }
  }
}

export async function createUiEventsBroker(
  options: UiEventsBrokerOptions
): Promise<UiEventsBroker> {
  const broker = new UiEventsBrokerImpl(options);
  await broker.start();
  return broker;
}
