import { resolveActiveMetaReviewRuntimeDelivery } from "../metaReview/metaReviewSnapshot.js";
import { isMetaReviewExecutionContextActiveState } from "../metaReview/metaReviewExecutionContext.js";
import type {
  BubbleExecutionContext,
  MetaReviewRuntimeDeliveryStatus,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateTypes.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import type { BubbleStatusState } from "./statusCommandTypes.js";

const metaReviewHumanGateRoutes = new Set<
  Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework">
>([
  "human_gate_sticky_bypass",
  "human_gate_approve",
  "human_gate_budget_exhausted",
  "human_gate_inconclusive",
  "human_gate_run_failed",
  "human_gate_dispatch_failed"
]);

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
  latestRecommendation: MetaReviewRecommendation | null;
  latestStatus: MetaReviewRunStatus | null;
  latestSummary: string | null;
  latestReportRef: string | null;
  latestUpdatedAt: string | null;
  latestRoute: MetaReviewGateRoute | null;
  latestRouteReasonCode: string | null;
  latestRouteObservedAt: string | null;
  runtimeDelivery: {
    status: MetaReviewRuntimeDeliveryStatus;
    reasonCode: string | null;
    message: string;
    observedAt: string;
    observedForHandoffId: string | null;
    observedForRound: number | null;
  } | null;
}

export interface StatusExecutionContextView {
  activeRole: BubbleExecutionContext["active_role"];
  awaitedOutputType: BubbleExecutionContext["awaited_output_type"];
  handoffId: string;
  round: number;
  startedAt: string;
  deadlineAt: string;
  attempt: number;
}

function resolveLatestMetaReviewRoute(transcript: ProtocolEnvelope[]): {
  route: MetaReviewGateRoute;
  reasonCode: string | null;
  observedAt: string;
} | null {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index]!;
    const metadata = envelope.payload.metadata;
    if (
      envelope.type === "APPROVAL_REQUEST" &&
      envelope.sender === "orchestrator" &&
      envelope.recipient === "human" &&
      metadata?.actor === "meta-reviewer"
    ) {
      const route = metadata.meta_review_gate_route;
      if (typeof route === "string" && metaReviewHumanGateRoutes.has(route as never)) {
        const reasonCode =
          typeof metadata.meta_review_gate_reason_code === "string"
            ? metadata.meta_review_gate_reason_code
            : null;
        return {
          route: route as Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework">,
          reasonCode,
          observedAt: envelope.ts
        };
      }
    }
    if (
      envelope.type === "APPROVAL_DECISION" &&
      envelope.sender === "orchestrator" &&
      envelope.payload.decision === "rework" &&
      metadata?.actor === "meta-reviewer"
    ) {
      return {
        route: "auto_rework",
        reasonCode: null,
        observedAt: envelope.ts
      };
    }
  }
  return null;
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
  state: BubbleStatusState,
  transcript: ProtocolEnvelope[]
) : {
  actor: "meta-reviewer";
  authorityActive: boolean;
  latestRecommendation: MetaReviewRecommendation | null;
  latestStatus: MetaReviewRunStatus | null;
  latestSummary: string | null;
  latestReportRef: string | null;
  latestUpdatedAt: string | null;
  latestRoute: MetaReviewGateRoute | null;
  latestRouteReasonCode: string | null;
  latestRouteObservedAt: string | null;
  runtimeDelivery: {
    status: MetaReviewRuntimeDeliveryStatus;
    reasonCode: string | null;
    message: string;
    observedAt: string;
    observedForHandoffId: string | null;
    observedForRound: number | null;
  } | null;
} {
  const activeRuntimeDelivery = resolveActiveMetaReviewRuntimeDelivery({
    executionContext: state.meta_review?.execution_context,
    runtimeDelivery: state.meta_review?.runtime_delivery
  });
  const route = resolveLatestMetaReviewRoute(transcript);
  return {
    actor: "meta-reviewer" as const,
    authorityActive: isMetaReviewExecutionContextActiveState(state),
    latestRecommendation:
      state.meta_review?.last_autonomous_recommendation ?? null,
    latestStatus: state.meta_review?.last_autonomous_status ?? null,
    latestSummary: state.meta_review?.last_autonomous_summary ?? null,
    latestReportRef: state.meta_review?.last_autonomous_report_ref ?? null,
    latestUpdatedAt: state.meta_review?.last_autonomous_updated_at ?? null,
    latestRoute: route?.route ?? null,
    latestRouteReasonCode: route?.reasonCode ?? null,
    latestRouteObservedAt: route?.observedAt ?? null,
    runtimeDelivery:
      activeRuntimeDelivery === null
        ? null
        : {
            status: activeRuntimeDelivery.status,
            reasonCode: activeRuntimeDelivery.reason_code,
            message: activeRuntimeDelivery.message,
            observedAt: activeRuntimeDelivery.observed_at,
            observedForHandoffId: activeRuntimeDelivery.observed_for_handoff_id,
            observedForRound: activeRuntimeDelivery.observed_for_round
          }
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
        round: executionContext.round,
        startedAt: executionContext.started_at,
        deadlineAt: executionContext.deadline_at,
        attempt: executionContext.attempt
      };
}
