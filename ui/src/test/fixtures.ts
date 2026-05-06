import type {
  BubbleCardModel,
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineDisplayItem,
  UiTimelineEntryDisplay,
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
  reviewPolicy?: UiBubbleSummary["reviewPolicy"];
  metaReview?: Partial<UiBubbleSummary["metaReview"]>;
  remoteExecution?: UiBubbleSummary["remoteExecution"];
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
    stateValidation: null,
    runtimeSession,
    runtime: {
      expected: true,
      present: runtimeSession !== null,
      stale: input.stale ?? false
    },
    attention: input.attention ?? null,
    reviewPolicy: input.reviewPolicy ?? {
      requested_loop_mode: "full",
      effective_loop_mode: "full",
      support_status: "enabled",
      reviewer_blocking_min_severity: "P3",
      meta_review_auto_rework_min_severity: "P3",
      meta_review_consecutive_clean_runs_required: 2
    },
    ...(input.remoteExecution !== undefined
      ? { remoteExecution: input.remoteExecution }
      : {}),
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: state === "RUNNING" && (input.activeRole ?? "implementer") === "meta_reviewer",
      consecutiveCleanRuns: 0,
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
  reviewPolicy?: UiBubbleSummary["reviewPolicy"];
  metaReview?: Partial<UiBubbleSummary["metaReview"]>;
  remoteExecution?: UiBubbleSummary["remoteExecution"];
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
  reviewPolicy?: UiBubbleSummary["reviewPolicy"];
  remoteExecution?: UiBubbleSummary["remoteExecution"];
  bubbleToml?: string;
  watchdog?: Partial<UiBubbleDetail["watchdog"]>;
  inboxItems?: UiBubbleDetail["inbox"]["items"];
  pendingInboxItems?: Partial<UiBubbleDetail["pendingInboxItems"]>;
}): UiBubbleDetail {
  const summary = bubbleSummary(input);
  const inboxItems =
    input.inboxItems ??
    [
      {
        envelopeId: "env-1",
        type: "HUMAN_QUESTION" as const,
        ts: "2026-02-24T12:01:00.000Z",
        round: 3,
        sender: "human",
        summary: "Need confirmation",
        refs: []
      }
    ];
  const computedPendingInboxItems = {
    humanQuestions: inboxItems.filter((item) => item.type === "HUMAN_QUESTION").length,
    approvalRequests: inboxItems.filter((item) => item.type === "APPROVAL_REQUEST").length,
    total: inboxItems.length
  };
  return {
    ...summary,
    bubbleToml: input.bubbleToml ?? `id = "${input.bubbleId}"`,
    watchdog: {
      monitored: true,
      monitoredAgent: summary.activeAgent,
      timeoutMinutes: 20,
      referenceTimestamp: summary.lastCommandAt,
      deadlineTimestamp: "2026-02-24T12:20:00.000Z",
      remainingSeconds: 960,
      expired: false,
      ...input.watchdog
    },
    pendingInboxItems: {
      ...computedPendingInboxItems,
      ...input.pendingInboxItems
    },
    inbox: {
      pending: {
        ...computedPendingInboxItems,
        ...input.pendingInboxItems
      },
      items: inboxItems
    },
    transcript: {
      totalMessages: 7,
      lastMessageType: "HUMAN_QUESTION",
      lastMessageTs: "2026-02-24T12:01:00.000Z",
      lastMessageId: "env-1"
    }
  };
}

function timelineEntrySummary(entry: Omit<UiTimelineEntry, "display">): Pick<
  UiTimelineEntryDisplay,
  "title" | "summaryText" | "summarySource"
> {
  if (entry.type === "HUMAN_QUESTION") {
    return {
      title: "Can you proceed?",
      summaryText: "Can you proceed?",
      summarySource: "question"
    };
  }
  if (entry.type === "HUMAN_REPLY") {
    return {
      title: "Human replied.",
      summaryText: "Human replied.",
      summarySource: "message"
    };
  }
  if (entry.type === "APPROVAL_REQUEST") {
    return {
      title: "Approval requested.",
      summaryText: "Approval requested.",
      summarySource: "summary"
    };
  }
  if (entry.type === "APPROVAL_DECISION") {
    return {
      title: "Approval decision recorded.",
      summaryText: "Approval decision recorded.",
      summarySource: "decision"
    };
  }
  if (entry.type === "CONVERGENCE") {
    return {
      title: "Convergence recorded.",
      summaryText: "Convergence recorded.",
      summarySource: "summary"
    };
  }
  return {
    title: "Timeline entry.",
    summaryText: "Timeline entry.",
    summarySource: "summary"
  };
}

function timelineEntryDisplay(entry: Omit<UiTimelineEntry, "display">): UiTimelineEntryDisplay {
  const summary = timelineEntrySummary(entry);
  return {
    ...summary,
    senderLabel: entry.sender,
    role:
      entry.type === "HUMAN_QUESTION" || entry.type === "HUMAN_REPLY"
        ? "human"
        : entry.type === "CONVERGENCE" || entry.sender === "orchestrator"
          ? "system"
          : "implementer",
    rowKind:
      entry.type === "HUMAN_QUESTION"
        ? "blocked"
        : entry.type === "APPROVAL_REQUEST" || entry.type === "APPROVAL_DECISION"
          ? "approval"
          : "normal",
    tone:
      entry.type === "HUMAN_QUESTION"
        ? "warning"
        : "neutral",
    badges: [],
    progress: null,
    validationFailure: null,
    syntheticApproval: null
  };
}

export function timelineEntry(overrides: Partial<UiTimelineEntry> = {}): UiTimelineEntry {
  const entryWithoutDisplay: Omit<UiTimelineEntry, "display"> = {
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
  return {
    ...entryWithoutDisplay,
    display: overrides.display ?? timelineEntryDisplay(entryWithoutDisplay)
  };
}

export function timelineDisplayItem(
  overrides: Partial<UiTimelineDisplayItem> = {}
): UiTimelineDisplayItem {
  return {
    id: "env-1",
    sourceEntryId: "env-1",
    ts: "2026-02-24T12:01:00.000Z",
    round: 3,
    role: "human",
    senderLabel: "human",
    title: "Can you proceed?",
    summaryText: "Can you proceed?",
    tone: "warning",
    badges: [],
    cleanRunTag: null,
    gateFailed: false,
    blocked: true,
    convergence: false,
    ...overrides
  };
}

export function protocolTimelineEntry(
  overrides: Partial<UiTimelineEntry> = {}
): UiTimelineEntry {
  return timelineEntry(overrides);
}
