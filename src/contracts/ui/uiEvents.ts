import type {
  UiBubbleSummary,
  UiRepoSummary
} from "./uiReadModel.js";

export const uiSseEventNames = [
  "connected",
  "snapshot",
  "bubble.updated",
  "bubble.removed",
  "repo.updated",
  "repo.removed",
  "heartbeat"
] as const;

export type UiSseEventName = (typeof uiSseEventNames)[number];

export interface UiEventsConnectedPayload {
  now: string;
  repos: string[];
}

export interface UiEventBase {
  id: number;
  ts: string;
  repoPath: string;
}

export interface UiBubbleUpdatedEvent extends UiEventBase {
  type: "bubble.updated";
  bubbleId: string;
  bubble: UiBubbleSummary;
}

export interface UiBubbleRemovedEvent extends UiEventBase {
  type: "bubble.removed";
  bubbleId: string;
}

export interface UiRepoUpdatedEvent extends UiEventBase {
  type: "repo.updated";
  repo: UiRepoSummary;
}

export interface UiRepoRemovedEvent extends UiEventBase {
  type: "repo.removed";
}

export interface UiSnapshotEvent {
  id: number;
  ts: string;
  type: "snapshot";
  repos: UiRepoSummary[];
  bubbles: UiBubbleSummary[];
}

export type UiEvent =
  | UiBubbleUpdatedEvent
  | UiBubbleRemovedEvent
  | UiRepoUpdatedEvent
  | UiRepoRemovedEvent
  | UiSnapshotEvent;
