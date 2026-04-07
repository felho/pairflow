import type { BubbleInboxView } from "../../../shared/inbox/inboxCommandApi.js";
import type {
  BubbleListEntry,
  BubbleListView
} from "../../../../core/bubble/listBubbles.js";
import type { BubbleStatusView } from "../../../shared/status/statusCommandApi.js";
import type { RuntimeSessionRecord } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { BubbleLifecycleState } from "../../../../types/bubble.js";
import type {
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiRuntimeHealth
} from "../../../../types/ui.js";
import { mapPendingInboxItems } from "../../../../types/ui.js";
import {
  isRuntimeSessionExpectedState,
  resolveBubbleAttention
} from "../../../shared/status/bubbleAttention.js";

export function isRuntimeSessionExpected(state: BubbleLifecycleState): boolean {
  return isRuntimeSessionExpectedState(state);
}

export function presentRuntimeHealth(
  state: BubbleLifecycleState,
  runtimeSession: RuntimeSessionRecord | null,
  stateValidation: BubbleListEntry["stateValidation"] = null
): UiRuntimeHealth {
  const expected = isRuntimeSessionExpected(state);
  const present = runtimeSession !== null;
  return {
    expected,
    present,
    stale: stateValidation !== null || expected !== present
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
    stateValidation: entry.stateValidation,
    runtimeSession: entry.runtimeSession,
    runtime: presentRuntimeHealth(
      entry.state,
      entry.runtimeSession,
      entry.stateValidation
    ),
    attention: entry.attention,
    metaReview: entry.metaReview
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
    stateValidation: input.status.stateValidation,
    runtimeSession: input.runtimeSession,
    runtime: presentRuntimeHealth(
      input.status.state,
      input.runtimeSession,
      input.status.stateValidation
    ),
    attention: resolveBubbleAttention({
      state: input.status.state,
      runtimeSession: input.runtimeSession,
      stateValidation: input.status.stateValidation,
      watchdog: input.status.watchdog,
      paneActivityRead:
        input.status.paneActivity.readStatus === "ok"
          ? {
              status: "ok",
              record: {
                bubble_id: input.status.bubbleId,
                sampled_at: input.status.paneActivity.sampledAt ?? "",
                pane_hash: "status-view",
                last_changed_at: input.status.paneActivity.lastChangedAt ?? "",
                ...(input.status.paneActivity.sessionName !== null
                  ? { session_name: input.status.paneActivity.sessionName }
                  : {}),
                ...(input.status.paneActivity.targetPane !== null
                  ? { target_pane: input.status.paneActivity.targetPane }
                  : {}),
                ...(input.status.paneActivity.lastSampleStatus !== null
                  ? { last_sample_status: input.status.paneActivity.lastSampleStatus }
                  : {}),
                ...(input.status.paneActivity.lastSampleError !== null
                  ? { last_sample_error: input.status.paneActivity.lastSampleError }
                  : {})
              }
            }
          : input.status.paneActivity.readStatus === "invalid"
            ? {
                status: "invalid",
                error: input.status.paneActivity.lastSampleError ?? "Invalid pane activity"
              }
            : {
                status: "missing"
              },
      now: new Date()
    }),
    metaReview: input.status.metaReview,
    watchdog: input.status.watchdog,
    pendingInboxItems: input.status.pendingInboxItems,
    inbox: {
      pending: input.inbox.pending,
      items: mapPendingInboxItems(input.inbox.items)
    },
    transcript: input.status.transcript
  };
}
