import type {
  BubbleCardModel,
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineEntry
} from "../lib/types";

export function repoSummary(repoPath: string): UiRepoSummary {
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
      registered: 1,
      stale: 0
    }
  };
}

export function bubbleSummary(input: {
  bubbleId: string;
  repoPath: string;
  state?: UiBubbleSummary["state"];
  runtimeSession?: UiBubbleSummary["runtimeSession"];
  stale?: boolean;
  round?: number;
  activeAgent?: UiBubbleSummary["activeAgent"];
  activeRole?: UiBubbleSummary["activeRole"];
  attention?: UiBubbleSummary["attention"];
  metaReview?: Partial<UiBubbleSummary["metaReview"]>;
}): UiBubbleSummary {
  const state = input.state ?? "RUNNING";
  const runtimeSession =
    input.runtimeSession === undefined
      ? {
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          worktreePath: `/tmp/${input.bubbleId}`,
          tmuxSessionName: `pf-${input.bubbleId}`,
          updatedAt: "2026-02-24T12:00:00.000Z"
        }
      : input.runtimeSession;

  return {
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    worktreePath: `/tmp/${input.bubbleId}`,
    state,
    round: input.round ?? 3,
    activeAgent: input.activeAgent ?? "codex",
    activeRole: input.activeRole ?? "implementer",
    activeSince: "2026-02-24T11:50:00.000Z",
    lastCommandAt: "2026-02-24T12:00:00.000Z",
    runtimeSession,
    runtime: {
      expected: true,
      present: runtimeSession !== null,
      stale: input.stale ?? false
    },
    attention: input.attention ?? null,
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: state === "RUNNING" && (input.activeRole ?? "implementer") === "meta_reviewer",
      latestRecommendation: "approve",
      latestStatus: "success",
      latestSummary: "Looks good.",
      latestReportRef: "artifacts/meta-review-last.json",
      latestUpdatedAt: "2026-02-24T12:00:00.000Z",
      latestRoute: null,
      latestRouteReasonCode: null,
      latestRouteObservedAt: null,
      runtimeDelivery: null,
      ...input.metaReview
    }
  };
}

export function bubbleCard(input: {
  bubbleId: string;
  repoPath: string;
  state?: UiBubbleSummary["state"];
  runtimeSession?: UiBubbleSummary["runtimeSession"];
  stale?: boolean;
  round?: number;
  activeAgent?: UiBubbleSummary["activeAgent"];
  activeRole?: UiBubbleSummary["activeRole"];
  attention?: UiBubbleSummary["attention"];
  metaReview?: Partial<UiBubbleSummary["metaReview"]>;
}): BubbleCardModel {
  const bubble = bubbleSummary(input);
  return {
    ...bubble,
    hasRuntimeSession: bubble.runtimeSession !== null
  };
}

export function bubbleDetail(input: {
  bubbleId: string;
  repoPath: string;
  state?: UiBubbleSummary["state"];
  runtimeSession?: UiBubbleSummary["runtimeSession"];
  stale?: boolean;
  attention?: UiBubbleSummary["attention"];
}): UiBubbleDetail {
  const summary = bubbleSummary(input);
  return {
    ...summary,
    watchdog: {
      monitored: true,
      monitoredAgent: summary.activeAgent,
      timeoutMinutes: 20,
      referenceTimestamp: summary.lastCommandAt,
      deadlineTimestamp: "2026-02-24T12:20:00.000Z",
      remainingSeconds: 960,
      expired: false
    },
    pendingInboxItems: {
      humanQuestions: 1,
      approvalRequests: 0,
      total: 1
    },
    inbox: {
      pending: {
        humanQuestions: 1,
        approvalRequests: 0,
        total: 1
      },
      items: [
        {
          envelopeId: "env-1",
          type: "HUMAN_QUESTION",
          ts: "2026-02-24T12:01:00.000Z",
          round: 3,
          sender: "human",
          summary: "Need confirmation",
          refs: []
        }
      ]
    },
    transcript: {
      totalMessages: 7,
      lastMessageType: "HUMAN_QUESTION",
      lastMessageTs: "2026-02-24T12:01:00.000Z",
      lastMessageId: "env-1"
    }
  };
}

export function timelineEntry(overrides: Partial<UiTimelineEntry> = {}): UiTimelineEntry {
  return {
    id: "env-1",
    ts: "2026-02-24T12:01:00.000Z",
    round: 3,
    type: "HUMAN_QUESTION",
    sender: "human",
    recipient: "codex",
    payload: {
      question: "Can you proceed?"
    },
    refs: [],
    ...overrides
  };
}
