import type { applyStateTransition } from "../../domain/state/machine.js";
import { buildRunningExecutionContext } from "../../shared/state/executionContext.js";
import { clearLiveMetaReviewSnapshot } from "../../shared/metaReview/metaReviewSnapshot.js";
import type {
  AgentName,
  BubbleReworkIntentRecord,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  EmitApprovalDecisionResult,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkQueuedResult
} from "./approvalCommandContract.js";

export interface ResolveApprovalNextStateInput {
  state: BubbleStateSnapshot;
  decision: "approve" | "rework";
  nowIso: string;
  implementer: AgentName;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  applyStateTransition: typeof applyStateTransition;
}

export function resolveApprovalNextState(
  input: ResolveApprovalNextStateInput
): BubbleStateSnapshot {
  if (input.decision === "approve") {
    return input.applyStateTransition(input.state, {
      to: "APPROVED_FOR_COMMIT",
      lastCommandAt: input.nowIso
    });
  }

  const nextRound = input.state.round + 1;
  const resumed = input.applyStateTransition(input.state, {
    to: "RUNNING",
    round: nextRound,
    activeAgent: input.implementer,
    activeRole: "implementer",
    executionContext: buildRunningExecutionContext({
      bubbleId: input.state.bubble_id,
      round: nextRound,
      activeRole: "implementer",
      startedAt: input.nowIso,
      watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
    }),
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer: input.implementer,
      reviewer: input.reviewer,
      switched_at: input.nowIso
    }
  });
  return {
    ...resumed,
    meta_review: clearLiveMetaReviewSnapshot(resumed.meta_review)
  };
}

export function mapImmediateReworkResult(
  immediate: EmitApprovalDecisionResult
): EmitRequestReworkImmediateResult {
  return {
    ...immediate,
    mode: "immediate"
  };
}

export function mapQueuedReworkResult(input: {
  bubbleId: string;
  state: BubbleStateSnapshot;
  intent: BubbleReworkIntentRecord;
  supersededIntentId?: string | undefined;
}): EmitRequestReworkQueuedResult {
  return {
    mode: "queued",
    bubbleId: input.bubbleId,
    intentId: input.intent.intent_id,
    ...(input.supersededIntentId !== undefined
      ? { supersededIntentId: input.supersededIntentId }
      : {}),
    state: input.state
  };
}
