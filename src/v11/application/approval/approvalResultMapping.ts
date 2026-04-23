import type { applyStateTransition } from "../../domain/state/machine.js";
import { clearLiveMetaReviewSnapshot } from "../../shared/metaReview/metaReviewSnapshot.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "../../shared/reviewPolicy/reviewPolicyRuntime.js";
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

  const continuation = resolveRuntimeAlignedNextRoundContinuation({
    bubbleId: input.state.bubble_id,
    currentRound: input.state.round,
    roundRoleHistory: input.state.round_role_history,
    implementer: input.implementer,
    reviewer: input.reviewer,
    nowIso: input.nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
  });
  const resumed = input.applyStateTransition(input.state, {
    to: "RUNNING",
    round: continuation.nextRound,
    activeAgent: continuation.activeAgent,
    activeRole: continuation.activeRole,
    executionContext: continuation.executionContext,
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso,
    ...(continuation.appendRoundRoleEntry !== undefined
      ? { appendRoundRoleEntry: continuation.appendRoundRoleEntry }
      : {})
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
