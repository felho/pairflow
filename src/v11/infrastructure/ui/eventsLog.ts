import type {
  UiBubbleRemovedEvent,
  UiBubbleUpdatedEvent,
  UiEvent,
  UiRepoRemovedEvent,
  UiRepoUpdatedEvent,
  UiSnapshotEvent
} from "../../../contracts/ui/uiEvents.js";
import type {
  UiBubbleSummary,
  UiRepoSummary
} from "../../../contracts/ui/uiReadModel.js";
import type { UiEventsSubscriptionInput } from "./eventsTypes.js";
import {
  createFilter,
  eventMatchesFilter,
  type UiEventFilter
} from "./eventsFilter.js";
import type { RepoSnapshot } from "./eventsState.js";
import { buildUiEventsSnapshot } from "./eventsSnapshot.js";

interface UiEventsListener {
  id: number;
  filter: UiEventFilter;
  callback: (event: UiEvent) => void;
}

export class UiEventsEventLog {
  private readonly historyLimit: number;
  private readonly listeners = new Map<number, UiEventsListener>();
  private readonly history: UiEvent[] = [];
  private nextListenerId = 1;
  private nextEventId = 1;

  public constructor(historyLimit: number) {
    this.historyLimit = historyLimit;
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

  public getSnapshot(
    snapshots: Map<string, RepoSnapshot>,
    input: UiEventsSubscriptionInput = {}
  ): UiSnapshotEvent {
    return buildUiEventsSnapshot({
      snapshots,
      nextEventId: this.nextEventId,
      subscription: input
    });
  }

  public clearListeners(): void {
    this.listeners.clear();
  }

  public notify(event: UiEvent): void {
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

  public nextBubbleUpdatedEvent(
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

  public nextBubbleRemovedEvent(
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

  public nextRepoEvent(repoPath: string, repo: UiRepoSummary): UiRepoUpdatedEvent {
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

  public nextRepoRemovedEvent(repoPath: string): UiRepoRemovedEvent {
    const id = this.nextEventId;
    this.nextEventId += 1;
    return {
      id,
      ts: new Date().toISOString(),
      type: "repo.removed",
      repoPath
    };
  }
}
