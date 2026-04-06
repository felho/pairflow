import { computeWatchdogStatus, type WatchdogStatus } from "../../../core/runtime/watchdog.js";
import { resolveActiveMetaReviewRuntimeDelivery } from "../../../core/bubble/metaReview.js";
import { isMetaReviewExecutionContextActiveState } from "../../../core/bubble/metaReviewExecutionContext.js";
import { type ReviewVerificationState } from "../../../core/reviewer/reviewVerification.js";
import type { StateValidationDiagnostics } from "../../infrastructure/state/stateStore.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateTypes.js";
import type {
  BubbleFailingGate,
  BubbleExecutionContext,
  BubbleLifecycleState,
  BubbleRoundGateState,
  BubbleSpecLockState,
  MetaReviewRuntimeDeliveryStatus,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolMessageType } from "../../../types/protocol.js";
import type {
  BubbleStatusState,
  ResolvedBubbleStatusContext,
  StatusGateState
} from "./statusCommandInternals.js";
import { toStatusCommandPathView } from "./statusCommandInternals.js";

const metaReviewHumanGateRoutes = new Set<Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework">>([
  "human_gate_sticky_bypass",
  "human_gate_approve",
  "human_gate_budget_exhausted",
  "human_gate_inconclusive",
  "human_gate_run_failed",
  "human_gate_dispatch_failed"
]);

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

export interface BubbleStatusView {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  bubbleStartedAt: string | null;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  paneActivity: {
    readStatus: ReadWatchdogPaneActivityResult["status"];
    lastChangedAt: string | null;
    sampledAt: string | null;
    sinceLastChangedSeconds: number | null;
    sinceSampledSeconds: number | null;
    lastSampleStatus: "sampled" | "no_session" | "pane_unreadable" | null;
    lastSampleError: string | null;
    sessionName: string | null;
    targetPane: string | null;
  };
  executionContext: {
    activeRole: BubbleExecutionContext["active_role"];
    awaitedOutputType: BubbleExecutionContext["awaited_output_type"];
    handoffId: string;
    round: number;
    startedAt: string;
    deadlineAt: string;
    attempt: number;
  } | null;
  watchdog: WatchdogStatus;
  pendingInboxItems: {
    humanQuestions: number;
    approvalRequests: number;
    total: number;
  };
  transcript: {
    totalMessages: number;
    lastMessageType: ProtocolMessageType | null;
    lastMessageTs: string | null;
    lastMessageId: string | null;
  };
  metaReview: {
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
  };
  commandPath: {
    status: "worktree_local" | "external" | "stale" | "missing" | "unknown";
    reasonCode?:
      | "PAIRFLOW_COMMAND_PATH_STALE"
      | "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
      | "PAIRFLOW_COMMAND_PATH_UNRESOLVED";
    profile: "external" | "self_host";
    localEntrypoint: string;
    activeEntrypoint: string | null;
    message: string;
    pinnedCommand: string;
  };
  accuracy_critical: boolean;
  last_review_verification: ReviewVerificationState;
  failing_gates: BubbleFailingGate[];
  spec_lock_state: BubbleSpecLockState;
  round_gate_state: BubbleRoundGateState;
  stateValidation: StateValidationDiagnostics | null;
}

export function buildBubbleStatusView({
  resolved,
  state,
  transcript,
  pendingQuestions,
  pendingApprovals,
  accuracyCritical,
  verificationStatus,
  gateState,
  stateValidation,
  paneActivityRead,
  now
}: {
  resolved: ResolvedBubbleStatusContext;
  state: BubbleStatusState;
  transcript: ProtocolEnvelope[];
  pendingQuestions: number;
  pendingApprovals: number;
  accuracyCritical: boolean;
  verificationStatus: ReviewVerificationState;
  gateState: StatusGateState;
  stateValidation: StateValidationDiagnostics | null;
  paneActivityRead: ReadWatchdogPaneActivityResult;
  now: Date;
}): BubbleStatusView {
  const lastMessage = transcript[transcript.length - 1] ?? null;
  const watchdog =
    stateValidation === null
      ? computeWatchdogStatus(
          state,
          resolved.bubbleConfig.watchdog_timeout_minutes,
          now
        )
      : {
          monitored: false,
          monitoredAgent: state.active_agent,
          timeoutMinutes: resolved.bubbleConfig.watchdog_timeout_minutes,
          referenceTimestamp: state.last_command_at ?? state.active_since,
          deadlineTimestamp: null,
          remainingSeconds: null,
          expired: false
        };
  const activeRuntimeDelivery = resolveActiveMetaReviewRuntimeDelivery({
    executionContext: state.meta_review?.execution_context,
    runtimeDelivery: state.meta_review?.runtime_delivery
  });
  const latestMetaReviewRoute = resolveLatestMetaReviewRoute(transcript);
  const paneActivity =
    paneActivityRead.status === "ok"
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
          lastSampleError: paneActivityRead.status === "invalid"
            ? paneActivityRead.error
            : null,
          sessionName: null,
          targetPane: null
        };
  return {
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    worktreePath: resolved.bubblePaths.worktreePath,
    bubbleStartedAt: inferBubbleStartedAtFromInstanceId(
      resolved.bubbleConfig.bubble_instance_id
    ),
    state: state.state,
    round: state.round,
    activeAgent: state.active_agent,
    activeRole: state.active_role,
    activeSince: state.active_since,
    lastCommandAt: state.last_command_at,
    paneActivity,
    executionContext:
      state.execution_context === null || state.execution_context === undefined
        ? null
        : {
            activeRole: state.execution_context.active_role,
            awaitedOutputType: state.execution_context.awaited_output_type,
            handoffId: state.execution_context.handoff_id,
            round: state.execution_context.round,
            startedAt: state.execution_context.started_at,
            deadlineAt: state.execution_context.deadline_at,
            attempt: state.execution_context.attempt
          },
    watchdog,
    pendingInboxItems: {
      humanQuestions: pendingQuestions,
      approvalRequests: pendingApprovals,
      total: pendingQuestions + pendingApprovals
    },
    transcript: {
      totalMessages: transcript.length,
      lastMessageType: lastMessage?.type ?? null,
      lastMessageTs: lastMessage?.ts ?? null,
      lastMessageId: lastMessage?.id ?? null
    },
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: isMetaReviewExecutionContextActiveState(state),
      latestRecommendation: state.meta_review?.last_autonomous_recommendation ?? null,
      latestStatus: state.meta_review?.last_autonomous_status ?? null,
      latestSummary: state.meta_review?.last_autonomous_summary ?? null,
      latestReportRef: state.meta_review?.last_autonomous_report_ref ?? null,
      latestUpdatedAt: state.meta_review?.last_autonomous_updated_at ?? null,
      latestRoute: latestMetaReviewRoute?.route ?? null,
      latestRouteReasonCode: latestMetaReviewRoute?.reasonCode ?? null,
      latestRouteObservedAt: latestMetaReviewRoute?.observedAt ?? null,
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
    },
    commandPath: toStatusCommandPathView(resolved),
    accuracy_critical: accuracyCritical,
    last_review_verification: verificationStatus,
    failing_gates: gateState.failingGates,
    spec_lock_state: gateState.specLockState,
    round_gate_state: gateState.roundGateState,
    stateValidation
  };
}

function resolveElapsedSeconds(
  value: string | null,
  now: Date
): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.max(0, Math.ceil((now.getTime() - parsed) / 1_000));
}

function inferBubbleStartedAtFromInstanceId(
  bubbleInstanceId: string | undefined
): string | null {
  if (bubbleInstanceId === undefined) {
    return null;
  }

  const segments = bubbleInstanceId.split("_");
  if (segments.length < 3 || segments[0] !== "bi") {
    return null;
  }

  const encodedTimestamp = segments[1];
  if (encodedTimestamp === undefined || !/^[0-9a-z]+$/u.test(encodedTimestamp)) {
    return null;
  }

  const timestampMs = Number.parseInt(encodedTimestamp, 36);
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 0) {
    return null;
  }

  const startedAt = new Date(timestampMs);
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }

  return startedAt.toISOString();
}
