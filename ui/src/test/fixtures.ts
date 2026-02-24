import type {
  BubbleCardModel,
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiStateCounts,
  UiTimelineEntry
} from "../lib/types";

export function stateCounts(overrides: Partial<UiStateCounts> = {}): UiStateCounts {
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
    CANCELLED: 0,
    ...overrides
  };
}

export function repoSummary(repoPath: string): UiRepoSummary {
  return {
    repoPath,
    total: 1,
    byState: stateCounts({ RUNNING: 1 }),
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
    round: 3,
    activeAgent: "codex",
    activeRole: "implementer",
    activeSince: "2026-02-24T11:50:00.000Z",
    lastCommandAt: "2026-02-24T12:00:00.000Z",
    runtimeSession,
    runtime: {
      expected: true,
      present: runtimeSession !== null,
      stale: input.stale ?? false
    }
  };
}

export function bubbleCard(input: {
  bubbleId: string;
  repoPath: string;
  state?: UiBubbleSummary["state"];
  runtimeSession?: UiBubbleSummary["runtimeSession"];
  stale?: boolean;
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
