import type {
  BubbleCardModel,
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineBadge,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function sanitizeLabel(value: string): string {
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : "unknown";
}

function badgeToneForSeverity(severity: string): UiTimelineBadge["tone"] {
  if (severity === "P0" || severity === "P1") return "danger";
  if (severity === "P2") return "warning";
  return "neutral";
}

function recommendationTone(label: string): UiTimelineBadge["tone"] {
  if (label === "approve") return "success";
  if (label === "rework") return "danger";
  if (label === "inconclusive") return "warning";
  return "neutral";
}

function decisionTone(label: string): UiTimelineBadge["tone"] {
  if (label === "approve") return "success";
  if (label === "rework") return "danger";
  return "neutral";
}

function buildDisplayBadges(
  entry: Omit<UiTimelineEntry, "display">,
  metadata: Record<string, unknown> | null
): UiTimelineBadge[] {
  const badges: UiTimelineBadge[] = [];
  const seen = new Set<string>();
  const add = (badge: UiTimelineBadge): void => {
    const key = `${badge.kind}:${badge.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      badges.push(badge);
    }
  };

  const findings = entry.payload.findings;
  if (Array.isArray(findings)) {
    const seenFindings = new Set<string>();
    for (const finding of findings) {
      if (!isRecord(finding)) {
        continue;
      }
      const severityValue = nonEmptyString(finding.severity);
      if (severityValue === null) {
        continue;
      }
      const severity = sanitizeLabel(severityValue);
      if (seenFindings.has(severity)) {
        continue;
      }
      seenFindings.add(severity);
      add({
        kind: "finding",
        label: severity,
        tone: badgeToneForSeverity(severity)
      });
    }
  }

  const decisionValue = nonEmptyString(entry.payload.decision);
  const decision =
    entry.type === "APPROVAL_DECISION" && decisionValue !== null
      ? sanitizeLabel(decisionValue)
      : null;
  if (decision !== null) {
    add({
      kind: "decision",
      label: decision,
      tone: decisionTone(decision)
    });
  }

  const recommendationValue = nonEmptyString(
    metadata?.latest_recommendation ?? metadata?.recommendation
  );
  const recommendation =
    recommendationValue === null ? null : sanitizeLabel(recommendationValue);
  if (recommendation !== null && recommendation !== decision) {
    add({
      kind: "recommendation",
      label: recommendation,
      tone: recommendationTone(recommendation)
    });
  }

  return badges;
}

function readMetaReviewHandoffAttempt(
  metadata: Record<string, unknown> | null
): number | null {
  const handoffId = metadata?.meta_review_handoff_id;
  if (typeof handoffId !== "string") {
    return null;
  }
  const match = /:attempt:(\d+)$/u.exec(handoffId);
  if (match === null) {
    return null;
  }
  const attempt = Number.parseInt(match[1] ?? "", 10);
  return Number.isInteger(attempt) && attempt > 0 ? attempt : null;
}

function timelineEntryDisplay(entry: Omit<UiTimelineEntry, "display">): UiTimelineEntryDisplay {
  const summaryValue = nonEmptyString(entry.payload.summary);
  const questionValue = nonEmptyString(entry.payload.question);
  const messageValue = nonEmptyString(entry.payload.message);
  const decisionValue = nonEmptyString(entry.payload.decision);
  const summary =
    summaryValue ??
    questionValue ??
    messageValue ??
    (decisionValue !== null ? `decision=${decisionValue}` : null) ??
    "(no summary payload)";
  const summarySource =
    summaryValue !== null
      ? "summary"
      : questionValue !== null
        ? "question"
        : messageValue !== null
          ? "message"
          : decisionValue !== null
            ? "decision"
            : "neutral";
  const metadata = isRecord(entry.payload.metadata) ? entry.payload.metadata : null;
  const deliveryTargetRole = metadata?.delivery_target_role;
  const hasMetaReviewerActor =
    metadata?.actor === "meta-reviewer" ||
    typeof metadata?.meta_review_handoff_id === "string";
  const role =
    hasMetaReviewerActor
      ? "meta_reviewer"
      : deliveryTargetRole !== undefined &&
          (
            typeof deliveryTargetRole !== "string" ||
            !["implementer", "reviewer", "meta_reviewer", "status"].includes(
              deliveryTargetRole
            )
          )
        ? "unknown"
        : entry.type === "HUMAN_QUESTION" || entry.type === "HUMAN_REPLY"
          ? "human"
          : entry.type === "CONVERGENCE"
            ? "system"
            : entry.type === "PASS" && deliveryTargetRole === "implementer"
              ? "reviewer"
              : entry.type === "PASS" &&
                  (deliveryTargetRole === "reviewer" ||
                    deliveryTargetRole === "meta_reviewer")
                ? "implementer"
                : entry.sender.toLowerCase() === "human"
                  ? "human"
                  : entry.sender === "orchestrator"
                    ? "system"
                    : entry.sender.toLowerCase().includes("review") ||
                        entry.sender.toLowerCase().includes("claude")
                      ? "reviewer"
                      : "implementer";
  const sender =
    metadata !== null &&
    typeof metadata.meta_review_handoff_id === "string" &&
    metadata.delivery_target_role === "meta_reviewer"
      ? entry.recipient
      : metadata !== null && typeof metadata.actor_agent === "string"
        ? metadata.actor_agent
        : entry.sender;
  const senderLabel =
    role === "unknown" ? "Unknown" : sender;
  const handoffAttempt = readMetaReviewHandoffAttempt(metadata);

  return {
    title: summary,
    summaryText: summary,
    summarySource,
    senderLabel,
    role,
    rowKind:
      entry.type === "HUMAN_QUESTION"
        ? "blocked"
        : typeof metadata?.meta_review_handoff_id === "string"
          ? "handoff"
        : entry.type === "APPROVAL_REQUEST" || entry.type === "APPROVAL_DECISION"
          ? "approval"
          : "normal",
    tone:
      entry.type === "HUMAN_QUESTION"
        ? "warning"
        : typeof metadata?.meta_review_handoff_id === "string"
          ? "info"
          : "neutral",
    badges: buildDisplayBadges(entry, metadata),
    progress:
      handoffAttempt !== null
        ? {
            kind: "meta_review_handoff",
            label: `handoff ${handoffAttempt}`,
            handoffAttempt
          }
        : null,
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

export function protocolTimelineEntry(
  overrides: Partial<UiTimelineEntry> = {}
): UiTimelineEntry {
  return timelineEntry(overrides);
}
