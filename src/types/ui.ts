import type { RuntimeSessionRecord } from "../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  BubbleLifecycleState
} from "./bubble.js";
import type {
  MetaReviewRecommendation,
  MetaReviewRuntimeDeliveryStatus,
  MetaReviewRunStatus
} from "./bubble.js";
import type {
  PendingInboxItemV11 as PendingInboxItem,
  PendingInboxItemV11Type as PendingInboxItemType
} from "../v11/application/inbox/emitInboxV11.js";
import type { ProtocolEnvelopePayload, ProtocolMessageType } from "./protocol.js";
import type { WatchdogStatus } from "../v11/shared/watchdog/watchdogStatus.js";
import type { StateValidationDiagnostics } from "../core/state/stateStore.js";

export interface UiBubbleStateCounts {
  CREATED: number;
  PREPARING_WORKSPACE: number;
  RUNNING: number;
  WAITING_HUMAN: number;
  READY_FOR_HUMAN_APPROVAL: number;
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

export type UiBubbleAttentionCode =
  | "state_invalid"
  | "runtime_missing"
  | "runtime_mismatch"
  | "no_session"
  | "pane_unreadable"
  | "pane_activity_invalid"
  | "watchdog_expired"
  | "quiet_pane";

export interface UiBubbleAttention {
  code: UiBubbleAttentionCode;
  severity: "warning" | "critical";
  label: string;
  detail?: string;
}

export interface UiBubbleMetaReviewSummary {
  actor: "meta-reviewer";
  authorityActive: boolean;
  latestRecommendation: MetaReviewRecommendation | null;
  latestStatus: MetaReviewRunStatus | null;
  latestSummary: string | null;
  latestReportRef: string | null;
  latestUpdatedAt: string | null;
  runtimeDelivery: {
    status: MetaReviewRuntimeDeliveryStatus;
    reasonCode: string | null;
    message: string;
    observedAt: string;
    observedForHandoffId: string | null;
    observedForRound: number | null;
  } | null;
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
  stateValidation: StateValidationDiagnostics | null;
  runtimeSession: RuntimeSessionRecord | null;
  runtime: UiRuntimeHealth;
  attention: UiBubbleAttention | null;
  metaReview: UiBubbleMetaReviewSummary;
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
