export const bubbleLifecycleStates = [
  "CREATED",
  "PREPARING_WORKSPACE",
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED",
  "DONE",
  "FAILED",
  "CANCELLED"
] as const;

export type BubbleLifecycleState = (typeof bubbleLifecycleStates)[number];
export const protocolMessageTypes = [
  "TASK",
  "PASS",
  "HUMAN_QUESTION",
  "HUMAN_REPLY",
  "CONVERGENCE",
  "APPROVAL_REQUEST",
  "APPROVAL_DECISION",
  "DONE_PACKAGE"
] as const;
export type ProtocolMessageType = (typeof protocolMessageTypes)[number];

export const bubbleActionKinds = [
  "start",
  "approve",
  "request-rework",
  "reply",
  "resume",
  "commit",
  "merge",
  "open",
  "stop"
] as const;
export type BubbleActionKind = (typeof bubbleActionKinds)[number];

export interface UiStateCounts {
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

export interface RuntimeSessionRecord {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  updatedAt: string;
}

export interface UiRuntimeHealth {
  expected: boolean;
  present: boolean;
  stale: boolean;
}

export interface UiPendingInboxCounts {
  humanQuestions: number;
  approvalRequests: number;
  total: number;
}

export type UiPendingInboxItemType = "HUMAN_QUESTION" | "APPROVAL_REQUEST";

export interface UiBubbleInboxItem {
  envelopeId: string;
  type: UiPendingInboxItemType;
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

export interface UiBubbleWatchdog {
  monitored: boolean;
  monitoredAgent: string | null;
  timeoutMinutes: number;
  referenceTimestamp: string | null;
  deadlineTimestamp: string | null;
  remainingSeconds: number | null;
  expired: boolean;
}

export interface UiBubbleTranscriptSummary {
  totalMessages: number;
  lastMessageType: ProtocolMessageType | null;
  lastMessageTs: string | null;
  lastMessageId: string | null;
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

export interface UiRepoSummary {
  repoPath: string;
  total: number;
  byState: UiStateCounts;
  runtimeSessions: {
    registered: number;
    stale: number;
  };
}

export interface UiApiErrorBody {
  error: {
    code: "bad_request" | "not_found" | "conflict" | "internal_error";
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface UiBubbleDetail extends UiBubbleSummary {
  watchdog: UiBubbleWatchdog;
  pendingInboxItems: UiPendingInboxCounts;
  inbox: UiBubbleInbox;
  transcript: UiBubbleTranscriptSummary;
}

export interface UiTimelineEntry {
  id: string;
  ts: string;
  round: number;
  type: ProtocolMessageType;
  sender: string;
  recipient: string;
  payload: Record<string, unknown>;
  refs: string[];
}

export interface UiEventBase {
  id: number;
  ts: string;
}

export interface UiBubbleUpdatedEvent extends UiEventBase {
  type: "bubble.updated";
  repoPath: string;
  bubbleId: string;
  bubble: UiBubbleSummary;
}

export interface UiBubbleRemovedEvent extends UiEventBase {
  type: "bubble.removed";
  repoPath: string;
  bubbleId: string;
}

export interface UiRepoUpdatedEvent extends UiEventBase {
  type: "repo.updated";
  repoPath: string;
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

export type ConnectionStatus = "idle" | "connecting" | "connected" | "fallback";

export interface BubbleCardModel extends UiBubbleSummary {
  hasRuntimeSession: boolean;
}

export interface CommitActionInput {
  auto: boolean;
  message?: string;
  refs?: string[];
}

export interface MergeActionInput {
  push?: boolean;
  deleteRemote?: boolean;
}

export interface BubblePosition {
  x: number;
  y: number;
}

export function emptyStateCounts(): UiStateCounts {
  return {
    CREATED: 0,
    PREPARING_WORKSPACE: 0,
    RUNNING: 0,
    WAITING_HUMAN: 0,
    READY_FOR_APPROVAL: 0,
    APPROVED_FOR_COMMIT: 0,
    COMMITTED: 0,
    DONE: 0,
    FAILED: 0,
    CANCELLED: 0
  };
}
