import {
  projectActiveMetaReviewRuntimeDelivery,
  type ActiveMetaReviewRuntimeDeliveryView
} from "../metaReview/metaReviewSnapshot.js";
import { isMetaReviewExecutionContextActiveState } from "../metaReview/metaReviewExecutionContext.js";
import type {
  BubbleExecutionContext
} from "../../../types/bubble.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import type { BubbleStatusState } from "./statusCommandTypes.js";

export interface StatusPaneActivityView {
  readStatus: ReadWatchdogPaneActivityResult["status"];
  lastChangedAt: string | null;
  sampledAt: string | null;
  sinceLastChangedSeconds: number | null;
  sinceSampledSeconds: number | null;
  lastSampleStatus: "sampled" | "no_session" | "pane_unreadable" | null;
  lastSampleError: string | null;
  sessionName: string | null;
  targetPane: string | null;
}

export interface StatusMetaReviewView {
  actor: "meta-reviewer";
  authorityActive: boolean;
  consecutiveCleanRuns: number;
  runtimeDelivery: ActiveMetaReviewRuntimeDeliveryView | null;
}

export interface StatusExecutionContextView {
  activeRole: BubbleExecutionContext["active_role"];
  awaitedOutputType: BubbleExecutionContext["awaited_output_type"];
  handoffId: string;
  executionId: string;
  round: number;
  startedAt: string;
  deadlineAt: string;
  attempt: number;
}

function resolveElapsedSeconds(value: string | null, now: Date): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.max(0, Math.ceil((now.getTime() - parsed) / 1_000));
}

export function buildStatusPaneActivityView(
  paneActivityRead: ReadWatchdogPaneActivityResult,
  now: Date
): StatusPaneActivityView {
  return paneActivityRead.status === "ok"
    ? {
        readStatus: paneActivityRead.status,
        lastChangedAt: paneActivityRead.record.last_changed_at,
        sampledAt: paneActivityRead.record.sampled_at,
        sinceLastChangedSeconds: resolveElapsedSeconds(
          paneActivityRead.record.last_changed_at,
          now
        ),
        sinceSampledSeconds: resolveElapsedSeconds(
          paneActivityRead.record.sampled_at,
          now
        ),
        lastSampleStatus: paneActivityRead.record.last_sample_status ?? null,
        lastSampleError: paneActivityRead.record.last_sample_error ?? null,
        sessionName: paneActivityRead.record.session_name ?? null,
        targetPane: paneActivityRead.record.target_pane ?? null
      }
    : {
        readStatus: paneActivityRead.status,
        lastChangedAt: null,
        sampledAt: null,
        sinceLastChangedSeconds: null,
        sinceSampledSeconds: null,
        lastSampleStatus: null,
        lastSampleError:
          paneActivityRead.status === "invalid" ? paneActivityRead.error : null,
        sessionName: null,
        targetPane: null
      };
}

export function buildStatusMetaReviewView(
  state: BubbleStatusState
): StatusMetaReviewView {
  const runtimeDelivery = projectActiveMetaReviewRuntimeDelivery({
    executionContext: state.meta_review?.execution_context,
    runtimeDelivery: state.meta_review?.runtime_delivery
  });
  return {
    actor: "meta-reviewer" as const,
    authorityActive: isMetaReviewExecutionContextActiveState(state),
    consecutiveCleanRuns: state.meta_review?.consecutive_clean_runs ?? 0,
    runtimeDelivery
  };
}

export function buildStatusExecutionContextView(
  executionContext: BubbleExecutionContext | null | undefined
): StatusExecutionContextView | null {
  return executionContext === null || executionContext === undefined
    ? null
    : {
        activeRole: executionContext.active_role,
        awaitedOutputType: executionContext.awaited_output_type,
        handoffId: executionContext.handoff_id,
        executionId: executionContext.execution_id,
        round: executionContext.round,
        startedAt: executionContext.started_at,
        deadlineAt: executionContext.deadline_at,
        attempt: executionContext.attempt
      };
}
