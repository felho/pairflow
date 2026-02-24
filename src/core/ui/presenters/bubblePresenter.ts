import type { BubbleInboxView } from "../../bubble/inboxBubble.js";
import type {
  BubbleListEntry,
  BubbleListView
} from "../../bubble/listBubbles.js";
import type { BubbleStatusView } from "../../bubble/statusBubble.js";
import type { RuntimeSessionRecord } from "../../runtime/sessionsRegistry.js";
import type { BubbleLifecycleState } from "../../../types/bubble.js";
import type {
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiRuntimeHealth
} from "../../../types/ui.js";
import { mapPendingInboxItems } from "../../../types/ui.js";

const runtimeExpectedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

export function isRuntimeSessionExpected(state: BubbleLifecycleState): boolean {
  return runtimeExpectedStates.has(state);
}

export function presentRuntimeHealth(
  state: BubbleLifecycleState,
  runtimeSession: RuntimeSessionRecord | null
): UiRuntimeHealth {
  const expected = isRuntimeSessionExpected(state);
  const present = runtimeSession !== null;
  return {
    expected,
    present,
    stale: expected !== present
  };
}

export function presentBubbleSummaryFromListEntry(
  entry: BubbleListEntry
): UiBubbleSummary {
  return {
    bubbleId: entry.bubbleId,
    repoPath: entry.repoPath,
    worktreePath: entry.worktreePath,
    state: entry.state,
    round: entry.round,
    activeAgent: entry.activeAgent,
    activeRole: entry.activeRole,
    activeSince: entry.activeSince,
    lastCommandAt: entry.lastCommandAt,
    runtimeSession: entry.runtimeSession,
    runtime: presentRuntimeHealth(entry.state, entry.runtimeSession)
  };
}

export function presentRepoSummary(view: BubbleListView): UiRepoSummary {
  return {
    repoPath: view.repoPath,
    total: view.total,
    byState: view.byState,
    runtimeSessions: view.runtimeSessions
  };
}

export function presentBubbleList(view: BubbleListView): {
  repo: UiRepoSummary;
  bubbles: UiBubbleSummary[];
} {
  return {
    repo: presentRepoSummary(view),
    bubbles: view.bubbles.map((bubble) => presentBubbleSummaryFromListEntry(bubble))
  };
}

export function presentBubbleDetail(input: {
  status: BubbleStatusView;
  inbox: BubbleInboxView;
  runtimeSession: RuntimeSessionRecord | null;
}): UiBubbleDetail {
  return {
    bubbleId: input.status.bubbleId,
    repoPath: input.status.repoPath,
    worktreePath: input.status.worktreePath,
    state: input.status.state,
    round: input.status.round,
    activeAgent: input.status.activeAgent,
    activeRole: input.status.activeRole,
    activeSince: input.status.activeSince,
    lastCommandAt: input.status.lastCommandAt,
    runtimeSession: input.runtimeSession,
    runtime: presentRuntimeHealth(input.status.state, input.runtimeSession),
    watchdog: input.status.watchdog,
    pendingInboxItems: input.status.pendingInboxItems,
    inbox: {
      pending: input.inbox.pending,
      items: mapPendingInboxItems(input.inbox.items)
    },
    transcript: input.status.transcript
  };
}
