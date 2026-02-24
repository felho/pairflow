import type { RuntimeSessionRecord } from "../core/runtime/sessionsRegistry.js";
import type {
  BubbleLifecycleState
} from "./bubble.js";
import type {
  PendingInboxItem,
  PendingInboxItemType
} from "../core/bubble/inboxBubble.js";
import type { ProtocolEnvelopePayload, ProtocolMessageType } from "./protocol.js";
import type { WatchdogStatus } from "../core/runtime/watchdog.js";

export interface UiBubbleStateCounts {
  CREATED: number;
  PREPARING_WORKSPACE: number;
  RUNNING: number;
  WAITING_HUMAN: number;
  READY_FOR_APPROVAL: number;
  APPROVED_FOR_COMMIT: number;
  COMMITTED: number;
  DONE: number;
  FAILED: number;
  CANCELLED: number;
}

export interface UiRuntimeHealth {
  expected: boolean;
  present: boolean;
  stale: boolean;
}

export interface UiBubbleSummary {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  runtimeSession: RuntimeSessionRecord | null;
  runtime: UiRuntimeHealth;
}

export interface UiPendingInboxCounts {
  humanQuestions: number;
  approvalRequests: number;
  total: number;
}

export interface UiBubbleInboxItem {
  envelopeId: string;
  type: PendingInboxItemType;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
}

export interface UiBubbleInbox {
  pending: UiPendingInboxCounts;
  items: UiBubbleInboxItem[];
}

export type UiBubbleWatchdog = WatchdogStatus;

export interface UiBubbleTranscriptSummary {
  totalMessages: number;
  lastMessageType: ProtocolMessageType | null;
  lastMessageTs: string | null;
  lastMessageId: string | null;
}

export interface UiBubbleDetail extends UiBubbleSummary {
  watchdog: UiBubbleWatchdog;
  pendingInboxItems: UiPendingInboxCounts;
  inbox: UiBubbleInbox;
  transcript: UiBubbleTranscriptSummary;
}

export interface UiRepoSummary {
  repoPath: string;
  total: number;
  byState: UiBubbleStateCounts;
  runtimeSessions: {
    registered: number;
    stale: number;
  };
}

export interface UiTimelineEntry {
  id: string;
  ts: string;
  round: number;
  type: ProtocolMessageType;
  sender: string;
  recipient: string;
  payload: ProtocolEnvelopePayload;
  refs: string[];
}

export interface UiApiErrorBody {
  error: {
    code: "bad_request" | "not_found" | "conflict" | "internal_error";
    message: string;
    details?: Record<string, unknown>;
  };
}

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
  | UiSnapshotEvent;

export function mapPendingInboxItems(items: PendingInboxItem[]): UiBubbleInboxItem[] {
  return items.map((item) => ({
    envelopeId: item.envelopeId,
    type: item.type,
    ts: item.ts,
    round: item.round,
    sender: item.sender,
    summary: item.summary,
    refs: item.refs
  }));
}
