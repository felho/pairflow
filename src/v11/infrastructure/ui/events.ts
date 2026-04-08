import type { FSWatcher } from "node:fs";
import type {
  UiEvent,
  UiSnapshotEvent
} from "../../../types/ui.js";
import type { UiEventsSubscriptionInput } from "./eventsTypes.js";
import {
  normalizeRepoPathForQueue
} from "./eventsFingerprint.js";
import type { RepoDiff, RepoSnapshot } from "./eventsState.js";
import {
  scanUiEventsAll,
  refreshUiEventsWatchers,
  scanUiEventsRepo
} from "./eventsScan.js";
import { UiEventsEventLog } from "./eventsLog.js";

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
  refreshNow(): Promise<void>;
  addRepo(repoPath: string): Promise<boolean>;
  removeRepo(repoPath: string): Promise<boolean>;
  close(): Promise<void>;
}

const defaultPollIntervalMs = 2_000;
const defaultDebounceMs = 150;
const defaultHistoryLimit = 512;

class UiEventsBrokerImpl implements UiEventsBroker {
  private readonly pollIntervalMs: number;
  private readonly debounceMs: number;
  private readonly historyLimit: number;
  private repos: string[];
  private readonly snapshots = new Map<string, RepoSnapshot>();
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly repoOperationQueues = new Map<string, Promise<void>>();
  private readonly repoOperationInFlight = new Map<
    string,
    {
      kind: "add" | "remove";
      promise: Promise<boolean>;
    }
  >();
  private readonly eventLog: UiEventsEventLog;
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
    this.eventLog = new UiEventsEventLog(this.historyLimit);
  }

  public async addRepo(repoPath: string): Promise<boolean> {
    if (this.closed) {
      return false;
    }

    const normalized = normalizeRepoPathForQueue(repoPath);
    const inFlight = this.repoOperationInFlight.get(normalized);
    if (inFlight?.kind === "add") {
      return inFlight.promise;
    }

    const pending = this.enqueueRepoOperation(normalized, () =>
      this.addRepoInternal(normalized)
    );
    const operationKind = "add" as const;
    this.repoOperationInFlight.set(normalized, {
      kind: operationKind,
      promise: pending
    });
    return pending.finally(() => {
      const active = this.repoOperationInFlight.get(normalized);
      if (active?.promise === pending && active.kind === operationKind) {
        this.repoOperationInFlight.delete(normalized);
      }
    });
  }

  public async removeRepo(repoPath: string): Promise<boolean> {
    if (this.closed) {
      return false;
    }

    const normalized = normalizeRepoPathForQueue(repoPath);
    const inFlight = this.repoOperationInFlight.get(normalized);
    if (inFlight?.kind === "remove") {
      return inFlight.promise;
    }

    const pending = this.enqueueRepoOperation(normalized, () =>
      this.removeRepoInternal(normalized)
    );
    const operationKind = "remove" as const;
    this.repoOperationInFlight.set(normalized, {
      kind: operationKind,
      promise: pending
    });
    return pending.finally(() => {
      const active = this.repoOperationInFlight.get(normalized);
      if (active?.promise === pending && active.kind === operationKind) {
        this.repoOperationInFlight.delete(normalized);
      }
    });
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
    return this.eventLog.subscribe(input, callback);
  }

  public getSnapshot(input: UiEventsSubscriptionInput = {}): UiSnapshotEvent {
    return this.eventLog.getSnapshot(this.snapshots, input);
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
    this.eventLog.clearListeners();
    if (this.scanInFlight) {
      await new Promise<void>((resolve) => {
        this.closeWaiters.push(resolve);
      });
    }
  }

  public async refreshNow(): Promise<void> {
    await this.scanAll(true);
  }

  private async addRepoInternal(normalized: string): Promise<boolean> {
    if (this.closed) {
      return false;
    }
    if (this.repos.includes(normalized)) {
      return false;
    }

    this.repos = [...this.repos, normalized].sort((left, right) =>
      left.localeCompare(right)
    );
    const diff = await this.scanRepo(normalized, true);
    await this.refreshWatchers();
    this.notify(this.eventLog.nextRepoEvent(normalized, diff.repo));
    for (const event of diff.changed) {
      this.notify(event);
    }
    return true;
  }

  private enqueueRepoOperation(
    normalized: string,
    task: () => Promise<boolean>
  ): Promise<boolean> {
    const previous = this.repoOperationQueues.get(normalized) ?? Promise.resolve();
    const result = previous
      .catch(() => undefined)
      .then(task);
    const queueTail = result.then(
      () => undefined,
      () => undefined
    );
    this.repoOperationQueues.set(normalized, queueTail);
    void queueTail.finally(() => {
      if (this.repoOperationQueues.get(normalized) === queueTail) {
        this.repoOperationQueues.delete(normalized);
      }
    });
    return result;
  }

  private async removeRepoInternal(normalized: string): Promise<boolean> {
    if (this.closed) {
      return false;
    }
    if (!this.repos.includes(normalized)) {
      return false;
    }

    this.repos = this.repos.filter((candidate) => candidate !== normalized);
    const previous = this.snapshots.get(normalized);
    this.snapshots.delete(normalized);
    const removedBubbleIds =
      previous === undefined
        ? []
        : [...previous.bubbles.keys()].sort((left, right) =>
            left.localeCompare(right)
          );

    await this.refreshWatchers();
    for (const bubbleId of removedBubbleIds) {
      this.notify(this.eventLog.nextBubbleRemovedEvent(normalized, bubbleId));
    }
    this.notify(this.eventLog.nextRepoRemovedEvent(normalized));
    return true;
  }

  private notify(event: UiEvent): void {
    this.eventLog.notify(event);
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
      await scanUiEventsAll({
        repos: this.repos,
        emitEvents,
        snapshots: this.snapshots,
        nextBubbleUpdatedEvent: (repoPath, bubble) =>
          this.eventLog.nextBubbleUpdatedEvent(repoPath, bubble),
        nextBubbleRemovedEvent: (repoPath, bubbleId) =>
          this.eventLog.nextBubbleRemovedEvent(repoPath, bubbleId),
        nextRepoEvent: (repoPath, repo) => this.eventLog.nextRepoEvent(repoPath, repo),
        refreshWatchers: () => this.refreshWatchers(),
        notify: (event) => this.notify(event)
      });
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

  private async scanRepo(repoPath: string, emitEvents: boolean): Promise<RepoDiff> {
    return scanUiEventsRepo({
      repoPath,
      emitEvents,
      snapshots: this.snapshots,
      nextBubbleUpdatedEvent: (repo, bubble) =>
        this.eventLog.nextBubbleUpdatedEvent(repo, bubble),
      nextBubbleRemovedEvent: (repo, bubbleId) =>
        this.eventLog.nextBubbleRemovedEvent(repo, bubbleId)
    });
  }

  private async refreshWatchers(): Promise<void> {
    await refreshUiEventsWatchers({
      repos: this.repos,
      watchers: this.watchers,
      scheduleScan: () => this.scheduleScan()
    });
  }
}

export async function createUiEventsBroker(
  options: UiEventsBrokerOptions
): Promise<UiEventsBroker> {
  const broker = new UiEventsBrokerImpl(options);
  await broker.start();
  return broker;
}
